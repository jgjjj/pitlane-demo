import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, CarFront, Check, ChevronRight, Clock3, LayoutDashboard, MapPin, Phone, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button as AstryxButton } from '@astryxdesign/core/Button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPreviewBooking, listBookings } from './lib/booking';
import { ownerServices } from './lib/owner-preview';
import { OwnerWorkspace } from './components/owner-workspace';
import { dateLabel, localDateKey, money, tenantTimeSlots } from './lib/format';
import { genericTenant, loadTenant, tenantFromPath } from './lib/tenant';
import { supabase } from './lib/supabase';
import type { BookingDraft, Service, TenantConfig } from './types';

const iconProps = { 'aria-hidden': true, size: 18 } as const;

function useTenant() {
  const slug = tenantFromPath(useLocation().pathname);
  return useQuery({ queryKey: ['tenant', slug], queryFn: () => loadTenant(slug), retry: false });
}

export default function App() {
  const result = useTenant();
  if (result.isLoading) return <StateScreen label="Загружаем студию" />;
  if (result.isError) return <StateScreen title="Студия не найдена" label="Проверьте ссылку или попробуйте позже." error />;
  return <TenantShell tenant={result.data ?? genericTenant} />;
}

function TenantShell({ tenant }: { tenant: TenantConfig }) {
  useEffect(() => {
    document.title = `${tenant.name} · Онлайн-запись`;
    document.documentElement.lang = tenant.locale.split('-')[0] ?? 'ru';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tenant.accent);
    let manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifest) { manifest = document.createElement('link'); manifest.rel = 'manifest'; document.head.appendChild(manifest); }
    manifest.href = `/manifests/${tenant.slug}.webmanifest`;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]'); if (icon && tenant.icon) icon.href = tenant.icon;
    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]'); if (appleIcon && tenant.appleTouchIcon) appleIcon.href = tenant.appleTouchIcon;
    document.querySelectorAll('link[data-tenant-startup]').forEach((node) => node.remove());
    for (const asset of tenant.startupAssets ?? []) { const startup = document.createElement('link'); startup.rel = 'apple-touch-startup-image'; startup.href = asset; startup.dataset.tenantStartup = tenant.slug; document.head.appendChild(startup); }
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register(`/s/${tenant.slug}/sw.js`, { scope: `/s/${tenant.slug}/` });
  }, [tenant]);
  return <div className="app" style={{ '--accent': tenant.accent } as CSSProperties}><Routes>
    <Route path="/s/:slug" element={<Home tenant={tenant} />} />
    <Route path="/s/:slug/book" element={<BookingFlow tenant={tenant} />} />
    <Route path="/s/:slug/booking/:token" element={<BookingAccess tenant={tenant} />} />
    <Route path="/s/:slug/owner/*" element={<Owner tenant={tenant} />} />
    <Route path="*" element={<Navigate to={`/s/${tenant.slug}`} replace />} />
  </Routes></div>;
}

function StateScreen({ title = 'Почти готово', label, error = false }: { title?: string; label: string; error?: boolean }) {
  return <main className="center-state" role={error ? 'alert' : 'status'}><div className={`state-icon ${error ? 'state-error' : ''}`}>{error ? <X {...iconProps} /> : <span className="spinner" />}</div><h1>{title}</h1><p>{label}…</p></main>;
}

function Header({ tenant, owner = false }: { tenant: TenantConfig; owner?: boolean }) {
  return <header className="topbar"><Link to={owner ? `/s/${tenant.slug}/owner` : `/s/${tenant.slug}`} className="brand" aria-label={tenant.name}><span className="brand-mark">{tenant.logo.slice(0, 1)}</span><span>{tenant.logo}</span></Link>{owner ? <span className="owner-label">Кабинет владельца</span> : <a className="icon-button" href={`tel:${tenant.phone.replace(/\D/g, '')}`} aria-label="Позвонить в студию"><Phone {...iconProps} /></a>}</header>;
}

function BottomNav({ tenant }: { tenant: TenantConfig }) {
  return <nav className="bottom-nav" aria-label="Основная навигация"><Link to={`/s/${tenant.slug}`}><CarFront {...iconProps} /><span>Студия</span></Link><Link className="nav-primary" to={`/s/${tenant.slug}/book`}><CalendarDays {...iconProps} /><span>Записаться</span></Link><a href={`tel:${tenant.phone.replace(/\D/g, '')}`}><Phone {...iconProps} /><span>Связаться</span></a></nav>;
}

function Home({ tenant }: { tenant: TenantConfig }) {
  const [selected, setSelected] = useState<Service | null>(null);
  const [services, setServices] = useState(() => tenant.mode === 'preview' ? ownerServices(tenant) : tenant.services);
  useEffect(() => { const sync = (event: Event) => { const detail = (event as CustomEvent<{ slug: string }>).detail; if (detail.slug === tenant.slug) setServices(ownerServices(tenant)); }; window.addEventListener('pitlane:owner-services-changed', sync); setServices(tenant.mode === 'preview' ? ownerServices(tenant) : tenant.services); return () => window.removeEventListener('pitlane:owner-services-changed', sync); }, [tenant]);
  const minimumPrice = Math.min(...services.map((service) => service.priceCents));
  return <div className="page public-page"><Header tenant={tenant} /><main className="studio-main"><section className="hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(7,9,9,.02) 15%, rgba(7,9,9,.28) 58%, rgba(7,9,9,.68) 100%), url(${tenant.hero})` }}><span className="hero-label">{tenant.city}</span><Link to={`/s/${tenant.slug}/book`} className="hero-action">Записаться <ArrowRight {...iconProps} /></Link></section><section className="studio-intro"><h1>{tenant.name}</h1><p>{tenant.description}</p><div className="studio-facts"><div><CarFront {...iconProps} /><strong>{services.length}</strong><span>услуг в прайсе</span></div><div><LayoutDashboard {...iconProps} /><strong>{tenant.resources.length}</strong><span>{tenant.resources.length === 1 ? 'бокс в работе' : 'бокса в работе'}</span></div></div><button type="button" className="price-fact" onClick={() => document.getElementById('services-title')?.scrollIntoView({ behavior: 'smooth' })}><span><strong>от {money(minimumPrice)}</strong><small>за услугу</small></span><ChevronRight {...iconProps} /></button></section><section className="quick-book"><div><span className="eyebrow">Запись в студию</span><h2>Свежий вид для вашего авто</h2><p>Выберите услугу и удобное время. Остальное возьмём на себя.</p></div><Link to={`/s/${tenant.slug}/book`} className="quick-book-action" aria-label="Открыть запись"><ArrowRight {...iconProps} /></Link></section><section className="content-section" aria-labelledby="services-title"><div className="section-heading"><div><span className="eyebrow">Прайс</span><h2 id="services-title">Услуги</h2></div><span className="muted">{services.length}</span></div><div className="service-list">{services.map((service) => <button type="button" key={service.id} className="service-card" onClick={() => setSelected(service)}><img src={service.image} alt="" /><div className="service-info"><span className="tag">{service.category}</span><h3>{service.name}</h3><p>{service.description}</p><div className="service-meta"><span><Clock3 {...iconProps} /> {duration(service.durationMinutes)}</span><strong>{money(service.priceCents)}</strong></div></div><ChevronRight className="card-arrow" {...iconProps} /></button>)}</div></section><a className="info-card" href={`https://maps.google.com/?q=${encodeURIComponent(tenant.address)}`} target="_blank" rel="noreferrer"><MapPin {...iconProps} /><span><strong>{tenant.address}</strong><small>{tenant.city} · открыть карту</small></span><ChevronRight {...iconProps} /></a></main><ServiceDrawer tenant={tenant} service={selected} onClose={() => setSelected(null)} /><BottomNav tenant={tenant} /></div>;
}

function ServiceDrawer({ tenant, service, onClose }: { tenant: TenantConfig; service: Service | null; onClose: () => void }) {
  return <Drawer open={Boolean(service)} onOpenChange={(open: boolean) => { if (!open) onClose(); }}><DrawerContent className="booking-drawer"><DrawerHeader><span className="eyebrow">{service?.category}</span><DrawerTitle>{service?.name}</DrawerTitle><DrawerDescription>{service?.description}</DrawerDescription></DrawerHeader>{service && <div className="drawer-details"><img src={service.image} alt="" /><div><span>Длительность</span><strong>{duration(service.durationMinutes)} + буфер</strong></div><div><span>Стоимость от</span><strong>{money(service.priceCents)}</strong></div></div>}<DrawerFooter><AstryxButton label="Выбрать эту услугу" variant="primary" width="100%" endContent={<ArrowRight {...iconProps} />} href={service ? `/s/${tenant.slug}/book?service=${service.id}` : `/s/${tenant.slug}/book`} /><DrawerClose render={<Button variant="ghost" className="full" />}>Закрыть</DrawerClose></DrawerFooter></DrawerContent></Drawer>;
}

function duration(minutes: number) { const hours = Math.floor(minutes / 60); const rest = minutes % 60; return `${hours ? `${hours} ч` : ''}${rest ? ` ${rest} мин` : ''}`.trim(); }

function BookingFlow({ tenant }: { tenant: TenantConfig }) {
  const [previewServices, setPreviewServices] = useState(() => tenant.mode === 'preview' ? ownerServices(tenant) : tenant.services);
  useEffect(() => { const sync = (event: Event) => { const detail = (event as CustomEvent<{ slug: string }>).detail; if (detail.slug === tenant.slug) setPreviewServices(ownerServices(tenant)); }; window.addEventListener('pitlane:owner-services-changed', sync); setPreviewServices(tenant.mode === 'preview' ? ownerServices(tenant) : tenant.services); return () => window.removeEventListener('pitlane:owner-services-changed', sync); }, [tenant]);
  const services = tenant.mode === 'preview' ? previewServices : tenant.services;
  const params = new URLSearchParams(useLocation().search); const initial = services.find((item) => item.id === params.get('service')) ?? null;
  const [step, setStep] = useState(initial ? 1 : 0); const [service, setService] = useState<Service | null>(initial); const [date, setDate] = useState(''); const [time, setTime] = useState(''); const [done, setDone] = useState(false); const [token, setToken] = useState(''); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(''); const [form, setForm] = useState({ name: '', phone: '', comment: '' }); const navigate = useNavigate();
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() + index); return localDateKey(day); }), []);
  const slots = useQuery({ queryKey: ['availability', tenant.slug, service?.id, date], enabled: tenant.mode === 'live' && Boolean(service && date && supabase), retry: false, queryFn: async () => { if (!supabase || !service || !date) return []; const { data, error } = await supabase.rpc('get_available_slots', { p_tenant_slug: tenant.slug, p_service_slug: service.id, p_local_date: date }); if (error) throw error; return (data ?? []) as Array<{ slot_time: string; starts_at: string }>; } });
  const draft = service ? { service, date, time, ...form } : null;
  const submit = async () => { if (!draft || !draft.name || !draft.phone) return; setSubmitting(true); setError(''); try { const booking = await submitBooking(tenant, draft); setToken(booking.accessToken); setDone(true); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось создать запись'); } finally { setSubmitting(false); } };
  if (done && service) return <Success tenant={tenant} service={service} date={date} time={time} name={form.name} token={token} />;
  return <div className="page"><Header tenant={tenant} /><main className="booking-page"><button type="button" className="back-button" onClick={() => step ? setStep(step - 1) : navigate(`/s/${tenant.slug}`)}><ArrowLeft {...iconProps} /> Назад</button><div className="progress" aria-label={`Шаг ${step + 1} из 4`}>{[0, 1, 2, 3].map((item) => <span key={item} className={step >= item ? 'active' : ''} />)}</div>{step === 0 && <Step title="Выберите услугу" eyebrow="Шаг 1 из 4"><div className="service-list compact">{services.map((item) => <button type="button" key={item.id} className={`service-card ${service?.id === item.id ? 'selected' : ''}`} onClick={() => { setService(item); setStep(1); }}><img src={item.image} alt="" /><div className="service-info"><span className="tag">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p><div className="service-meta"><span><Clock3 {...iconProps} /> {duration(item.durationMinutes)}</span><strong>{money(item.priceCents)}</strong></div></div>{service?.id === item.id && <Check className="selected-check" {...iconProps} />}</button>)}</div></Step>}{step === 1 && <Step title="Когда приехать?" eyebrow="Шаг 2 из 4"><div className="date-grid">{days.map((day) => <button type="button" key={day} className={date === day ? 'selected' : ''} onClick={() => { setDate(day); setTime(''); }} aria-pressed={date === day}>{dateLabel(day)}</button>)}</div>{date ? <div className="times"><span className="label">{slots.isLoading ? 'Проверяем свободные посты…' : 'Свободное время'}</span><div className="time-grid">{(tenant.mode === 'live' ? (slots.data ?? []).map((slot) => slot.slot_time) : tenantTimeSlots(tenant.workingHours, date)).map((slot) => <button type="button" key={slot} className={time === slot ? 'selected' : ''} onClick={() => { setTime(slot); setStep(2); }} aria-pressed={time === slot}>{slot}</button>)}</div>{slots.isError && <p className="error-text" role="alert">Не удалось загрузить свободные слоты.</p>}{!slots.isLoading && tenant.mode === 'live' && slots.data?.length === 0 && <p className="hint">На этот день свободных слотов нет.</p>}</div> : <p className="hint">Выберите дату, чтобы увидеть доступные слоты.</p>}</Step>}{step === 2 && <Step title="Ваши контакты" eyebrow="Шаг 3 из 4"><div className="form-stack"><Field label="Имя" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Как к вам обращаться" autoFocus /><Field label="Телефон" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} placeholder="+7 900 000-00-00" /><div><Label htmlFor="comment">Комментарий <span className="optional">необязательно</span></Label><Textarea id="comment" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder="Особые пожелания" /></div></div><Button className="button-accent full" disabled={!form.name || !form.phone} onClick={() => setStep(3)}>Проверить запись <ArrowRight {...iconProps} /></Button></Step>}{step === 3 && service && <Step title="Проверьте детали" eyebrow="Шаг 4 из 4"><Card className="summary-card large"><CardHeader><span className="summary-service">Вы выбрали</span><CardTitle>{service.name}</CardTitle></CardHeader><CardContent><div className="summary-row"><span>Дата и время</span><strong>{dateLabel(date)}, {time}</strong></div><div className="summary-row"><span>Клиент</span><strong>{form.name}</strong><small>{form.phone}</small></div><div className="summary-row summary-price"><span>Стоимость</span><strong>{money(service.priceCents)}</strong><small>Финальная цена подтверждается студией</small></div></CardContent></Card><Button className="button-accent full" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Сохраняем…' : 'Подтвердить запись'} {submitting ? <span className="button-spinner" /> : <Check {...iconProps} />}</Button>{error && <p className="error-text" role="alert">{error}</p>}<p className="fine-print">Данные нужны только для организации визита.</p></Step>}</main></div>;
}

function Step({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) { return <section className="booking-step" aria-labelledby="step-title"><span className="eyebrow">{eyebrow}</span><h1 id="step-title">{title}</h1>{children}</section>; }
function Field({ label, value, onChange, placeholder, type = 'text', autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; autoFocus?: boolean }) { return <div><Label htmlFor={label}>{label}</Label><Input id={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoFocus={autoFocus} /></div>; }

function Success({ tenant, service, date, time, name, token }: { tenant: TenantConfig; service: Service; date: string; time: string; name: string; token: string }) { return <div className="page"><Header tenant={tenant} /><main className="success-page"><div className="success-mark"><Check {...iconProps} size={34} /></div><span className="eyebrow">Запись подтверждена</span><h1>До встречи<br />в студии</h1><p>Сохранили визит. Детали доступны по персональной ссылке.</p><Card className="summary-card success-summary"><CardContent><div className="success-service"><span>Услуга</span><strong>{service.name}</strong></div><div className="success-detail"><span>Дата и время</span><strong>{dateLabel(date)}, {time}</strong></div><div className="success-detail"><span>Имя</span><strong>{name}</strong></div></CardContent></Card><Button asChild className="button-accent full"><Link to={`/s/${tenant.slug}/booking/${token}`}>Открыть детали <ArrowRight {...iconProps} /></Link></Button><Link className="text-link" to={`/s/${tenant.slug}`}>Вернуться в студию</Link></main></div>; }

async function submitBooking(tenant: TenantConfig, draft: BookingDraft) {
  const endpoint = import.meta.env.VITE_SUPABASE_URL; const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (tenant.mode === 'live' && endpoint && anonKey) {
    const retryKey = getRetryKey(tenant.slug, draft);
    const response = await fetch(`${endpoint}/functions/v1/create-booking`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ tenantSlug: tenant.slug, serviceSlug: draft.service.id, localDate: draft.date, localTime: draft.time, customerName: draft.name, customerPhone: draft.phone, customerComment: draft.comment, idempotencyKey: retryKey, accessToken: retryKey }) });
    const payload = await response.json() as { booking?: { booking_id: string; access_token: string; resource_name: string }; error?: string }; if (!response.ok || !payload.booking) throw new Error(payload.error ?? 'Сервис записи временно недоступен'); return { ...draft, id: payload.booking.booking_id, accessToken: payload.booking.access_token, resourceName: payload.booking.resource_name, status: 'confirmed' as const, createdAt: new Date().toISOString() };
  }
  if (tenant.mode === 'live') throw new Error('Интеграция записи не настроена'); return createPreviewBooking(tenant.slug, draft);
}

function getRetryKey(slug: string, draft: BookingDraft) {
  const key = `pitlane:retry:${slug}:${draft.service.id}:${draft.date}:${draft.time}:${draft.phone}`;
  const existing = sessionStorage.getItem(key); if (existing) return existing;
  const generated = `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
  sessionStorage.setItem(key, generated); return generated;
}

function BookingAccess({ tenant }: { tenant: TenantConfig }) {
  const { token } = useParams();
  const client = supabase;
  const live = tenant.mode === 'live' && Boolean(client);
  const liveBooking = useQuery({ queryKey: ['booking-access', tenant.slug, token], enabled: live && Boolean(token), retry: false, queryFn: async () => {
    if (!client || !token) throw new Error('Ссылка недействительна');
    const { data, error } = await client.rpc('get_booking_by_token', { p_tenant_slug: tenant.slug, p_access_token: token });
    if (error || !data) throw new Error('Ссылка недействительна');
    return data as { serviceName: string; startsAt: string; endsAt: string; status: string; resourceName?: string; priceCents: number; address: string };
  }});
  const previewBooking = listBookings(tenant.slug).find((item) => item.accessToken === token);
  if (live) {
    if (liveBooking.isLoading) return <div className="page"><Header tenant={tenant} /><StateScreen label="Проверяем доступ к записи" /></div>;
    if (liveBooking.isError || !liveBooking.data) return <div className="page"><Header tenant={tenant} /><StateScreen title="Ссылка недействительна" label="Проверьте ссылку из сообщения или запросите доступ повторно" error /></div>;
    const icsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-ics?tenantSlug=${encodeURIComponent(tenant.slug)}&accessToken=${encodeURIComponent(token ?? '')}`;
    return <div className="page"><Header tenant={tenant} /><main className="booking-page"><span className="eyebrow">Ваша запись</span><h1>{liveBooking.data.serviceName}</h1><Card className="summary-card large"><CardContent><div><span>Дата и время</span><strong>{new Date(liveBooking.data.startsAt).toLocaleString(tenant.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: tenant.timezone })}</strong></div><div><span>Студия</span><strong>{tenant.name}</strong><small>{liveBooking.data.address || tenant.address}</small></div><div><span>Статус</span><strong className="accent-text">{liveBooking.data.status === 'confirmed' ? 'Подтверждена' : liveBooking.data.status}</strong></div></CardContent></Card><div className="access-actions"><a className="button button-ghost full" href={icsUrl}><CalendarDays {...iconProps} /> Скачать ICS</a><a className="button button-ghost full" href={`tel:${tenant.phone.replace(/\D/g, '')}`}><Phone {...iconProps} /> Связаться со студией</a></div></main></div>;
  }
  return <div className="page"><Header tenant={tenant} /><main className="booking-page">{previewBooking ? <><span className="eyebrow">Ваша запись</span><h1>{previewBooking.service.name}</h1><Card className="summary-card large"><CardContent><div><span>Дата и время</span><strong>{dateLabel(previewBooking.date)}, {previewBooking.time}</strong></div><div><span>Студия</span><strong>{tenant.name}</strong><small>{tenant.address}</small></div><div><span>Статус</span><strong className="accent-text">Подтверждена</strong></div></CardContent></Card><a className="button button-ghost full" href={`tel:${tenant.phone.replace(/\D/g, '')}`}><Phone {...iconProps} /> Связаться со студией</a></> : <StateScreen title="Ссылка недействительна" label="Проверьте ссылку из сообщения или запросите доступ повторно" error />}</main></div>;
}

function Owner({ tenant }: { tenant: TenantConfig }) {
  return <OwnerWorkspace tenant={tenant} />;
}
