insert into public.tenants (slug,name,timezone,locale,mode,config) values
('graphite','GRAPHITE Detailing','Europe/Moscow','ru-RU','preview',jsonb_build_object('accent','#d9ff57','city','Москва · Хамовники','logo','GRAPHITE','hero','/tenants/graphite/hero.svg','description','Точная работа с кузовом, салоном и характером вашего автомобиля.','phone','+7 495 000-12-42','address','ул. Усачёва, 62')),
('oxide','OXIDE Garage','Europe/Moscow','ru-RU','preview',jsonb_build_object('accent','#ff8a5b','city','Санкт-Петербург · Петроградка','logo','OXIDE','hero','/tenants/oxide/hero.svg','description','Характерный уход за автомобилем в ритме города.','phone','+7 812 000-77-11','address','Большой проспект П.С., 41'))
on conflict (slug) do update set name=excluded.name, config=excluded.config;
insert into public.usage_counters(tenant_id) select id from public.tenants on conflict do nothing;

insert into public.services (tenant_id, slug, name, description, duration_minutes, buffer_minutes, price_cents, image_path)
select t.id, v.slug, v.name, v.description, v.duration_minutes, v.buffer_minutes, v.price_cents, v.image_path
from public.tenants t join (values
  ('graphite','ceramic','Керамика кузова','Глубокий блеск и защита лакокрасочного покрытия.',480,60,4500000,'/tenants/graphite/ceramic.svg'),
  ('graphite','interior','Детейлинг салона','Глубокая чистка материалов и восстановление фактуры.',300,45,2800000,'/tenants/graphite/interior.svg'),
  ('graphite','polish','Полировка кузова','Убираем мелкие дефекты, возвращаем глубину цвета.',360,60,3200000,'/tenants/graphite/polish.svg'),
  ('oxide','wash','Комплексная мойка','Бережная мойка кузова и сухая уборка салона.',120,30,1600000,'/tenants/oxide/wash.svg'),
  ('oxide','wrap','Защитная плёнка','Прозрачная защита зон риска от сколов и царапин.',720,120,8500000,'/tenants/oxide/wrap.svg')
) as v(tenant_slug,slug,name,description,duration_minutes,buffer_minutes,price_cents,image_path) on v.tenant_slug=t.slug
on conflict (tenant_id, slug) do update set name=excluded.name, description=excluded.description, duration_minutes=excluded.duration_minutes, buffer_minutes=excluded.buffer_minutes, price_cents=excluded.price_cents, image_path=excluded.image_path;

update public.services set config=jsonb_build_object('category', case slug when 'ceramic' then 'Защита' when 'interior' then 'Салон' when 'polish' then 'Кузов' when 'wash' then 'Уход' when 'wrap' then 'Защита' else 'Услуга' end);

insert into public.resources (tenant_id, slug, name, kind)
select t.id, v.slug, v.name, v.kind from public.tenants t join (values
  ('graphite','post-1','Пост 1','detailing_bay'), ('graphite','post-2','Пост 2','detailing_bay'), ('oxide','bay-a','Бокс A','wash_bay')
) as v(tenant_slug,slug,name,kind) on v.tenant_slug=t.slug
on conflict (tenant_id, slug) do update set name=excluded.name, kind=excluded.kind;

insert into public.business_hours (tenant_id, weekday, opens_at, closes_at)
select t.id, v.weekday, v.opens_at::time, v.closes_at::time from public.tenants t join (values
  ('graphite',1,'09:00','21:00'),('graphite',2,'09:00','21:00'),('graphite',3,'09:00','21:00'),('graphite',4,'09:00','21:00'),('graphite',5,'09:00','21:00'),('graphite',6,'10:00','20:00'),
  ('oxide',1,'10:00','22:00'),('oxide',2,'10:00','22:00'),('oxide',3,'10:00','22:00'),('oxide',4,'10:00','22:00'),('oxide',5,'10:00','22:00'),('oxide',6,'10:00','22:00'),('oxide',0,'11:00','20:00')
) as v(tenant_slug,weekday,opens_at,closes_at) on v.tenant_slug=t.slug
on conflict (tenant_id, weekday) do update set opens_at=excluded.opens_at, closes_at=excluded.closes_at;
