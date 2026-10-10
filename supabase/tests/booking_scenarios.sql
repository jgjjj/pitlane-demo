-- Integration scenarios. Run with `supabase test db` after `supabase db reset`.
create extension if not exists pgtap;
begin;
select plan(12);

insert into public.tenants(id,slug,name,timezone,mode,config) values ('00000000-0000-0000-0000-000000000901','test-garage','Test Garage','Europe/Moscow','preview','{}');
insert into public.services(id,tenant_id,slug,name,duration_minutes,buffer_minutes,price_cents) values
  ('00000000-0000-0000-0000-000000000902','00000000-0000-0000-0000-000000000901','short','Short',60,30,1000),
  ('00000000-0000-0000-0000-000000000903','00000000-0000-0000-0000-000000000901','long','Long',1440,60,2000);
insert into public.resources(id,tenant_id,slug,name,kind) values
  ('00000000-0000-0000-0000-000000000904','00000000-0000-0000-0000-000000000901','r1','R1','bay'),
  ('00000000-0000-0000-0000-000000000905','00000000-0000-0000-0000-000000000901','r2','R2','bay');
insert into public.business_hours(tenant_id,weekday,opens_at,closes_at) values ('00000000-0000-0000-0000-000000000901',1,'09:00','21:00');

select lives_ok($$select * from public.create_booking('test-garage','short','2026-10-12 10:00:00+03','One','+70000000001','','retry-one','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')$$, 'first booking succeeds');
select is((select count(*)::int from public.bookings where tenant_id='00000000-0000-0000-0000-000000000901'),1,'one booking created');
select is((select count(*)::int from public.resource_occupancies where tenant_id='00000000-0000-0000-0000-000000000901' and kind='booking'),1,'one occupancy created');
select lives_ok($$select * from public.create_booking('test-garage','short','2026-10-12 10:00:00+03','One','+70000000001','','retry-one','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')$$, 'retry is idempotent');
select is((select count(*)::int from public.bookings where tenant_id='00000000-0000-0000-0000-000000000901'),1,'retry does not duplicate');
select lives_ok($$select * from public.create_booking('test-garage','short','2026-10-12 10:00:00+03','Two','+70000000002','','retry-two','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')$$, 'second resource accepts overlap');
select throws_ok($$select * from public.create_booking('test-garage','short','2026-10-12 10:00:00+03','Three','+70000000003','','retry-three','cccccccccccccccccccccccccccccccccccccccccccccccc')$$, 'NO_RESOURCE_AVAILABLE', 'third overlap is rejected');
select lives_ok($$select * from public.create_booking('test-garage','long','2026-10-13 09:00:00+03','Long','+70000000004','','retry-long','dddddddddddddddddddddddddddddddddddddddddddddddd')$$, 'multi-day occupancy succeeds');
select is((select ends_at > starts_at + interval '23 hours' from public.bookings where idempotency_key=encode(digest('retry-long','sha256'),'hex')),true,'multi-day range is continuous');
insert into public.resource_occupancies(tenant_id,resource_id,kind,starts_at,ends_at,note) values ('00000000-0000-0000-0000-000000000901','00000000-0000-0000-0000-000000000904','block','2026-10-20 09:00+03','2026-10-20 12:00+03','maintenance');
select throws_ok($$select public.create_resource_block('00000000-0000-0000-0000-000000000901','00000000-0000-0000-0000-000000000904','2026-10-20 10:00+03','2026-10-20 11:00+03','conflict')$$, 'MEMBERSHIP_REQUIRED', 'owner block requires membership');
select has_view('public','tenant_statistics','statistics view exists');
select has_function('public','get_booking_by_token','token access function exists');
select * from finish();
rollback;
