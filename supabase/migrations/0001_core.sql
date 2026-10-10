create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create type public.tenant_mode as enum ('preview', 'live');
create type public.booking_status as enum ('confirmed', 'cancelled', 'completed', 'no_show');
create type public.occupancy_kind as enum ('booking', 'block');
create type public.notification_kind as enum ('booking_created', 'booking_rescheduled', 'booking_cancelled', 'reminder');

create table public.tenants (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null, timezone text not null, locale text not null default 'ru-RU',
  mode public.tenant_mode not null default 'preview', config jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  primary key (tenant_id, user_id)
);
create table public.services (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null, name text not null, description text not null default '', duration_minutes int not null check (duration_minutes > 0),
  buffer_minutes int not null default 0 check (buffer_minutes >= 0), price_cents bigint not null check (price_cents >= 0),
  image_path text not null default '', config jsonb not null default '{}', active boolean not null default true, unique (tenant_id, slug), unique (tenant_id, id)
);
create table public.resources (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null, name text not null, kind text not null, capacity int not null default 1 check (capacity > 0),
  active boolean not null default true, unique (tenant_id, slug), unique (tenant_id, id)
);
create table public.business_hours (
  tenant_id uuid not null references public.tenants(id) on delete cascade, weekday smallint not null check (weekday between 0 and 6),
  opens_at time, closes_at time, primary key (tenant_id, weekday), check ((opens_at is null and closes_at is null) or (opens_at < closes_at))
);
create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, reason text not null default '', check (starts_at < ends_at), unique (tenant_id, id)
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_id uuid not null, customer_name text not null, customer_phone text not null, customer_comment text not null default '',
  starts_at timestamptz not null, ends_at timestamptz not null, status public.booking_status not null default 'confirmed',
  price_cents bigint not null, service_duration_minutes int not null, idempotency_key text not null,
  access_token_hash text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key), unique (tenant_id, id), unique (tenant_id, access_token_hash),
  foreign key (tenant_id, service_id) references public.services(tenant_id, id)
);
create table public.resource_occupancies (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_id uuid not null, booking_id uuid, kind public.occupancy_kind not null,
  starts_at timestamptz not null, ends_at timestamptz not null, note text not null default '',
  slot tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  check (starts_at < ends_at), unique (tenant_id, id), unique (tenant_id, booking_id),
  foreign key (tenant_id, resource_id) references public.resources(tenant_id, id),
  foreign key (tenant_id, booking_id) references public.bookings(tenant_id, id)
);
alter table public.resource_occupancies add constraint resource_occupancies_no_overlap exclude using gist (resource_id with =, slot with &&) where (kind in ('booking', 'block'));
create index bookings_tenant_starts_idx on public.bookings (tenant_id, starts_at);
create index occupancies_tenant_range_idx on public.resource_occupancies using gist (tenant_id, slot);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null, kind public.notification_kind not null, channel text not null check (channel in ('push', 'ics', 'sms')),
  dedupe_key text not null, payload jsonb not null default '{}', status text not null default 'pending' check (status in ('pending', 'leased', 'available', 'sent', 'failed')),
  attempts int not null default 0, lease_until timestamptz, last_error text, available_at timestamptz not null default now(),
  unique (tenant_id, dedupe_key), foreign key (tenant_id, booking_id) references public.bookings(tenant_id, id)
);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  endpoint text not null, p256dh text not null, auth text not null, user_id uuid references auth.users(id), unique (tenant_id, endpoint)
);
create table public.tenant_assets (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  path text not null, kind text not null check (kind in ('hero','service','gallery','icon')), created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  unique (tenant_id, path)
);
create table public.usage_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade, public_requests int not null default 0,
  llm_requests int not null default 0, llm_tokens int not null default 0, period_start date not null default current_date
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null, amount_cents bigint not null check (amount_cents >= 0), status text not null check (status in ('pending','paid','refunded','failed')),
  provider text not null, provider_payment_id text, paid_at timestamptz, created_at timestamptz not null default now(),
  unique (tenant_id, booking_id, provider), foreign key (tenant_id, booking_id) references public.bookings(tenant_id, id)
);
create view public.tenant_statistics with (security_invoker = true) as
select b.tenant_id, date_trunc('day', b.starts_at at time zone t.timezone) as period,
  count(*) filter (where b.status in ('confirmed','completed')) as scheduled_arrivals,
  count(*) filter (where b.status = 'completed') as completed_orders,
  coalesce((select sum(p.amount_cents) from public.payments p where p.tenant_id=b.tenant_id and p.status='paid' and date_trunc('day', p.paid_at at time zone t.timezone) = date_trunc('day', b.starts_at at time zone t.timezone)), 0) as received_payments_cents
from public.bookings b join public.tenants t on t.id=b.tenant_id
group by b.tenant_id, t.timezone, date_trunc('day', b.starts_at at time zone t.timezone);

create or replace function public.is_member(check_tenant uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenant_memberships where tenant_id = check_tenant and user_id = auth.uid());
$$;
create or replace function public.claim_public_request(check_tenant uuid, max_requests int default 1000) returns boolean language plpgsql security definer set search_path = public as $$
declare allowed boolean;
begin
  insert into usage_counters(tenant_id) values (check_tenant) on conflict (tenant_id) do nothing;
  update usage_counters set public_requests = case when period_start < current_date then 1 else public_requests + 1 end, period_start = current_date
    where tenant_id = check_tenant and (period_start < current_date or public_requests < max_requests) returning true into allowed;
  return coalesce(allowed, false);
end $$;

create or replace function public.claim_llm_request(check_tenant uuid, max_requests int default 100, max_tokens int default 100000, requested_tokens int default 0) returns boolean language plpgsql security definer set search_path = public as $$
declare allowed boolean;
begin
  if not is_member(check_tenant) then return false; end if;
  insert into usage_counters(tenant_id) values (check_tenant) on conflict (tenant_id) do nothing;
  update usage_counters set
    llm_requests = case when period_start < current_date then 1 else llm_requests + 1 end,
    llm_tokens = case when period_start < current_date then requested_tokens else llm_tokens + requested_tokens end,
    period_start = current_date
  where tenant_id = check_tenant and (period_start < current_date or (llm_requests < max_requests and llm_tokens + requested_tokens <= max_tokens))
  returning true into allowed;
  return coalesce(allowed, false);
end $$;

create or replace function public.get_public_tenant(p_slug text) returns jsonb language sql volatile security definer set search_path = public as $$
  select jsonb_build_object(
    'slug', t.slug, 'tenantId', t.id, 'name', t.name, 'city', coalesce(t.config->>'city',''), 'timezone', t.timezone, 'locale', t.locale, 'mode', t.mode,
    'accent', coalesce(t.config->>'accent','#d9ff57'), 'logo', coalesce(t.config->>'logo',t.slug), 'hero', coalesce(t.config->>'hero',''),
    'description', coalesce(t.config->>'description',''), 'phone', coalesce(t.config->>'phone',''), 'address', coalesce(t.config->>'address',''), 'config', t.config,
    'services', coalesce((select jsonb_agg(jsonb_build_object('id', s.slug, 'name', s.name, 'description', s.description, 'durationMinutes', s.duration_minutes, 'bufferMinutes', s.buffer_minutes, 'priceCents', s.price_cents, 'image', s.image_path, 'category', coalesce(s.config->>'category', 'Услуга')) order by s.name) from services s where s.tenant_id = t.id and s.active), '[]'::jsonb),
    'resources', coalesce((select jsonb_agg(jsonb_build_object('id', r.slug, 'name', r.name, 'kind', r.kind, 'capacity', r.capacity) order by r.name) from resources r where r.tenant_id = t.id and r.active), '[]'::jsonb),
    'workingHours', coalesce((select jsonb_object_agg(h.weekday::text, jsonb_build_object('open', h.opens_at::text, 'close', h.closes_at::text)) from business_hours h where h.tenant_id = t.id and h.opens_at is not null), '{}'::jsonb)
  ) from tenants t where t.slug = p_slug and t.mode in ('preview','live') and public.claim_public_request(t.id);
$$;

create or replace function public.get_member_tenant_id(p_slug text) returns uuid language sql stable security definer set search_path = public as $$
  select t.id from tenants t join tenant_memberships m on m.tenant_id=t.id where t.slug=p_slug and m.user_id=auth.uid();
$$;

create or replace function public.get_booking_by_token(p_tenant_slug text, p_access_token text) returns jsonb language sql volatile security definer set search_path = public as $$
  select jsonb_build_object('id', b.id, 'serviceName', s.name, 'startsAt', b.starts_at, 'endsAt', b.ends_at, 'status', b.status, 'resourceName', r.name, 'priceCents', b.price_cents, 'address', coalesce(t.config->>'address',''))
  from bookings b join tenants t on t.id=b.tenant_id join services s on s.id=b.service_id
  left join resource_occupancies o on o.booking_id=b.id left join resources r on r.id=o.resource_id
  where t.slug=p_tenant_slug and b.access_token_hash=encode(digest(p_access_token,'sha256'),'hex') and public.claim_public_request(t.id) limit 1;
$$;

create or replace function public.get_available_slots(p_tenant_slug text, p_service_slug text, p_local_date date)
returns table (slot_time text, starts_at timestamptz) language plpgsql volatile security definer set search_path = public as $$
declare t tenants%rowtype; s services%rowtype; h business_hours%rowtype; window_start timestamptz; window_end timestamptz; candidate timestamptz; finish timestamptz;
begin
  select * into t from tenants where slug=p_tenant_slug and mode in ('preview','live'); if not found then raise exception 'TENANT_NOT_FOUND'; end if;
  if not claim_public_request(t.id) then raise exception 'PUBLIC_RATE_LIMIT'; end if;
  if length(coalesce(p_idempotency_key,'')) < 32 or (p_access_token is not null and length(p_access_token) < 32) then raise exception 'INVALID_RETRY_TOKEN'; end if;
  select * into s from services where tenant_id=t.id and slug=p_service_slug and active; if not found then raise exception 'SERVICE_NOT_FOUND'; end if;
  select * into h from business_hours where tenant_id=t.id and weekday=extract(dow from p_local_date)::smallint; if not found or h.opens_at is null then return; end if;
  window_start := (p_local_date::text || ' ' || h.opens_at::text)::timestamp at time zone t.timezone;
  window_end := (p_local_date::text || ' ' || h.closes_at::text)::timestamp at time zone t.timezone;
  for candidate in select generate_series(window_start, window_end - interval '1 minute', interval '30 minutes') loop
    finish := candidate + make_interval(mins => s.duration_minutes + s.buffer_minutes);
    if not exists (select 1 from schedule_exceptions x where x.tenant_id=t.id and tstzrange(x.starts_at,x.ends_at,'[]') && tstzrange(candidate,finish,'[)'))
       and exists (select 1 from resources r where r.tenant_id=t.id and r.active and not exists (select 1 from resource_occupancies o where o.tenant_id=t.id and o.resource_id=r.id and o.slot && tstzrange(candidate,finish,'[)'))) then
      slot_time := to_char(candidate at time zone t.timezone, 'HH24:MI'); starts_at := candidate; return next;
    end if;
  end loop;
end $$;

create or replace function public.create_booking(
  p_tenant_slug text, p_service_slug text, p_starts_at timestamptz, p_customer_name text, p_customer_phone text,
  p_customer_comment text, p_idempotency_key text, p_access_token text default null
) returns table (booking_id uuid, access_token text, resource_name text, starts_at timestamptz, ends_at timestamptz, price_cents bigint)
language plpgsql security definer set search_path = public as $$
declare t tenants%rowtype; s services%rowtype; r resources%rowtype; existing bookings%rowtype; finish timestamptz; token text; hash text; idempotency_hash text;
begin
  select * into t from tenants where slug = p_tenant_slug and mode in ('preview','live'); if not found then raise exception 'TENANT_NOT_FOUND'; end if;
  if not claim_public_request(t.id) then raise exception 'PUBLIC_RATE_LIMIT'; end if;
  idempotency_hash := encode(digest(p_idempotency_key, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(t.id::text || ':' || idempotency_hash, 0));
  select * into existing from bookings where tenant_id=t.id and idempotency_key=idempotency_hash;
  if found then
    if p_access_token is null or existing.access_token_hash <> encode(digest(p_access_token, 'sha256'), 'hex') then raise exception 'IDEMPOTENCY_TOKEN_REQUIRED'; end if;
    select b.id, p_access_token, coalesce(rr.name, 'Ресурс'), b.starts_at, b.ends_at, b.price_cents into booking_id, access_token, resource_name, starts_at, ends_at, price_cents from bookings b left join resource_occupancies oo on oo.booking_id=b.id left join resources rr on rr.id=oo.resource_id where b.id=existing.id limit 1; return next; return;
  end if;
  select * into s from services where tenant_id=t.id and slug=p_service_slug and active; if not found then raise exception 'SERVICE_NOT_FOUND'; end if;
  finish := p_starts_at + make_interval(mins => s.duration_minutes + s.buffer_minutes);
  if p_customer_name is null or length(trim(p_customer_name)) < 2 then raise exception 'INVALID_CUSTOMER'; end if;
  -- Business hours define the intake moment. A service may occupy a resource across days.
  if not exists (select 1 from business_hours h where h.tenant_id=t.id and h.weekday=extract(isodow from p_starts_at at time zone t.timezone)::int % 7 and h.opens_at is not null and (p_starts_at at time zone t.timezone)::time >= h.opens_at and (p_starts_at at time zone t.timezone)::time < h.closes_at) then raise exception 'OUTSIDE_WORKING_HOURS'; end if;
  if exists (select 1 from schedule_exceptions x where x.tenant_id=t.id and tstzrange(x.starts_at,x.ends_at,'[]') && tstzrange(p_starts_at,finish,'[)')) then raise exception 'SCHEDULE_EXCEPTION'; end if;
  perform pg_advisory_xact_lock(hashtextextended(t.id::text, 0));
  select * into r from resources where tenant_id=t.id and active and not exists (select 1 from resource_occupancies o where o.tenant_id=t.id and o.resource_id=resources.id and o.slot && tstzrange(p_starts_at,finish,'[)')) order by id limit 1;
  if not found then raise exception 'NO_RESOURCE_AVAILABLE'; end if;
  token := coalesce(p_access_token, encode(gen_random_bytes(24), 'hex')); hash := encode(digest(token, 'sha256'), 'hex');
  insert into bookings(tenant_id,service_id,customer_name,customer_phone,customer_comment,starts_at,ends_at,price_cents,service_duration_minutes,idempotency_key,access_token_hash) values (t.id,s.id,trim(p_customer_name),trim(p_customer_phone),coalesce(p_customer_comment,''),p_starts_at,finish,s.price_cents,s.duration_minutes,idempotency_hash,hash) returning id into booking_id;
  insert into resource_occupancies(tenant_id,resource_id,booking_id,kind,starts_at,ends_at) values (t.id,r.id,booking_id,'booking',p_starts_at,finish);
  insert into notification_jobs(tenant_id,booking_id,kind,channel,dedupe_key,payload,status) values (t.id,booking_id,'booking_created','ics',booking_id::text||':ics',jsonb_build_object('status',case when t.mode='preview' then 'preview_safe' else 'available_on_demand' end),case when t.mode='preview' then 'available' else 'available' end) on conflict do nothing;
  if t.mode = 'live' then insert into notification_jobs(tenant_id,booking_id,kind,channel,dedupe_key,payload) values (t.id,booking_id,'booking_created','push',booking_id::text||':push',jsonb_build_object('status','pending','tenantSlug',t.slug)); end if;
  access_token := token; resource_name := r.name; starts_at := p_starts_at; ends_at := finish; price_cents := s.price_cents; return next;
exception when exclusion_violation then raise exception 'NO_RESOURCE_AVAILABLE';
end $$;

create or replace function public.reschedule_booking(p_tenant_slug text, p_booking_id uuid, p_access_token text, p_starts_at timestamptz)
returns table (booking_id uuid, starts_at timestamptz, ends_at timestamptz) language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype; s services%rowtype; r resources%rowtype; new_end timestamptz; old_start timestamptz;
begin
  select b.* into b from bookings b join tenants t on t.id=b.tenant_id where b.id=p_booking_id and t.slug=p_tenant_slug and b.access_token_hash=encode(digest(p_access_token,'sha256'),'hex') and b.status='confirmed' for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  select * into s from services where id=b.service_id; new_end:=p_starts_at+make_interval(mins=>s.duration_minutes+s.buffer_minutes);
  if not exists (select 1 from business_hours h join tenants t on t.id=b.tenant_id where h.tenant_id=b.tenant_id and h.weekday=extract(isodow from p_starts_at at time zone t.timezone)::int % 7 and h.opens_at is not null and (p_starts_at at time zone t.timezone)::time >= h.opens_at and (p_starts_at at time zone t.timezone)::time < h.closes_at) then raise exception 'OUTSIDE_WORKING_HOURS'; end if;
  if exists (select 1 from schedule_exceptions x where x.tenant_id=b.tenant_id and tstzrange(x.starts_at,x.ends_at,'[]') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'SCHEDULE_EXCEPTION'; end if;
  perform pg_advisory_xact_lock(hashtextextended(b.tenant_id::text, 0));
  select * into r from resources where tenant_id=b.tenant_id and active and not exists (select 1 from resource_occupancies o where o.tenant_id=b.tenant_id and o.resource_id=resources.id and o.booking_id<>b.id and o.slot && tstzrange(p_starts_at,new_end,'[)')) order by id limit 1;
  if not found then raise exception 'NO_RESOURCE_AVAILABLE'; end if;
  select starts_at into old_start from resource_occupancies where booking_id=b.id for update;
  update resource_occupancies set resource_id=r.id, starts_at=p_starts_at, ends_at=new_end where booking_id=b.id;
  update bookings set starts_at=p_starts_at, ends_at=new_end, updated_at=now() where id=b.id;
  insert into notification_jobs(tenant_id,booking_id,kind,channel,dedupe_key,payload) values (b.tenant_id,b.id,'booking_rescheduled','ics',b.id::text||':rescheduled:'||extract(epoch from now())::text,jsonb_build_object('old_start',old_start,'new_start',p_starts_at));
  if (select mode from tenants where id=b.tenant_id) = 'live' then insert into notification_jobs(tenant_id,booking_id,kind,channel,dedupe_key,payload) values (b.tenant_id,b.id,'booking_rescheduled','push',b.id::text||':rescheduled:push:'||extract(epoch from now())::text,jsonb_build_object('tenantSlug',p_tenant_slug)); end if;
  booking_id:=b.id; starts_at:=p_starts_at; ends_at:=new_end; return next;
exception when exclusion_violation then raise exception 'NO_RESOURCE_AVAILABLE';
end $$;

create or replace function public.cancel_booking(p_tenant_slug text, p_booking_id uuid, p_access_token text) returns boolean language plpgsql security definer set search_path=public as $$
declare b bookings%rowtype;
begin select b.* into b from bookings b join tenants t on t.id=b.tenant_id where b.id=p_booking_id and t.slug=p_tenant_slug and b.access_token_hash=encode(digest(p_access_token,'sha256'),'hex') and b.status='confirmed' for update; if not found then return false; end if; update bookings set status='cancelled',updated_at=now() where id=b.id; delete from resource_occupancies where booking_id=b.id; insert into notification_jobs(tenant_id,booking_id,kind,channel,dedupe_key) values (b.tenant_id,b.id,'booking_cancelled','ics',b.id::text||':cancelled'); if (select mode from tenants where id=b.tenant_id) = 'live' then insert into notification_jobs(tenant_id,booking_id,kind,channel,dedupe_key,payload) values (b.tenant_id,b.id,'booking_cancelled','push',b.id::text||':cancelled:push',jsonb_build_object('tenantSlug',p_tenant_slug)); end if; return true; end $$;

create or replace function public.create_resource_block(p_tenant_id uuid, p_resource_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_note text default '') returns uuid language plpgsql security definer set search_path=public as $$
declare block_id uuid;
begin
  if not is_member(p_tenant_id) then raise exception 'MEMBERSHIP_REQUIRED'; end if;
  insert into resource_occupancies(tenant_id,resource_id,kind,starts_at,ends_at,note) values (p_tenant_id,p_resource_id,'block',p_starts_at,p_ends_at,coalesce(p_note,'')) returning id into block_id;
  return block_id;
exception when exclusion_violation then raise exception 'RESOURCE_ALREADY_BLOCKED';
end $$;

create or replace function public.claim_notification_jobs(p_limit int default 50)
returns table (id uuid, tenant_id uuid, booking_id uuid, channel text, payload jsonb)
language plpgsql security definer set search_path=public as $$
begin
  return query
  with picked as (
    select j.id from notification_jobs j
    where j.status in ('pending','failed') and j.available_at <= now() and (j.lease_until is null or j.lease_until < now())
    order by j.available_at, j.id for update skip locked limit greatest(1, least(p_limit, 100))
  ), leased as (
    update notification_jobs j set status='leased', lease_until=now()+interval '2 minutes', attempts=j.attempts+1
    from picked p where p.id=j.id returning j.id, j.tenant_id, j.booking_id, j.channel, j.payload
  ) select leased.id, leased.tenant_id, leased.booking_id, leased.channel, leased.payload from leased;
end $$;

alter table tenants enable row level security; alter table services enable row level security; alter table resources enable row level security; alter table bookings enable row level security; alter table resource_occupancies enable row level security; alter table notification_jobs enable row level security; alter table tenant_memberships enable row level security; alter table push_subscriptions enable row level security; alter table payments enable row level security; alter table tenant_assets enable row level security;
create policy tenants_public_config on tenants for select using (true);
create policy services_public_active on services for select using (active and exists(select 1 from tenants t where t.id=tenant_id and t.mode in ('preview','live')));
create policy resources_member on resources for all using (is_member(tenant_id)) with check (is_member(tenant_id));
create policy bookings_member on bookings for select using (is_member(tenant_id));
create policy occupancies_member on resource_occupancies for select using (is_member(tenant_id));
create policy jobs_member on notification_jobs for select using (is_member(tenant_id));
create policy membership_self on tenant_memberships for select using (user_id=auth.uid());
create policy push_member on push_subscriptions for all using (is_member(tenant_id) or user_id=auth.uid()) with check (is_member(tenant_id) or user_id=auth.uid());
create policy payments_member on payments for select using (is_member(tenant_id));
create policy tenant_assets_member on tenant_assets for all using (is_member(tenant_id)) with check (is_member(tenant_id));
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
revoke all on all functions in schema public from public;
grant execute on function public.create_booking(text,text,timestamptz,text,text,text,text,text), public.reschedule_booking(text,uuid,text,timestamptz), public.cancel_booking(text,uuid,text) to anon, authenticated;
grant execute on function public.create_resource_block(uuid,uuid,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.get_public_tenant(text) to anon, authenticated;
grant execute on function public.claim_llm_request(uuid,int,int,int) to authenticated;
grant execute on function public.get_member_tenant_id(text) to authenticated;
grant execute on function public.get_booking_by_token(text,text) to anon, authenticated;
grant execute on function public.get_available_slots(text,text,date) to anon, authenticated;
grant execute on function public.claim_notification_jobs(int) to service_role;
grant execute on function public.claim_public_request(uuid,int) to anon, authenticated;
grant select on resources, bookings, resource_occupancies, notification_jobs, tenant_memberships to authenticated;
grant select, insert, update, delete on tenant_assets to authenticated;
grant select on tenant_statistics to authenticated;
grant select, insert, update, delete on push_subscriptions to authenticated;
