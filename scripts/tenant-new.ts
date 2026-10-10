import { writeTenant, tenantRoot } from './tenant-utils';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const slug = process.argv[2];
if (!slug) throw new Error('Usage: npm run tenant:new -- <slug>');
const config = { slug, name: 'Новая студия', city: 'Ваш город', timezone: 'Europe/Moscow', locale: 'ru-RU', mode: 'preview' as const, accent: '#d9ff57', logo: slug.toUpperCase(), hero: `/tenants/${slug}/hero.svg`, icon: `/tenants/${slug}/icon.svg`, maskableIcon: `/tenants/${slug}/maskable.svg`, appleTouchIcon: `/tenants/${slug}/apple-touch-icon.svg`, startupAssets: [`/tenants/${slug}/startup.svg`], description: 'Описание новой студии.', phone: '+7 000 000-00-00', address: 'Адрес студии', services: [{ id: 'service-1', name: 'Новая услуга', description: 'Опишите услугу.', durationMinutes: 60, bufferMinutes: 15, priceCents: 100000, image: `/tenants/${slug}/service-1.svg`, category: 'Услуга' }], resources: [{ id: 'resource-1', name: 'Пост 1', kind: 'bay', capacity: 1 }], workingHours: { mon: { open: '09:00', close: '18:00' }, tue: { open: '09:00', close: '18:00' }, wed: { open: '09:00', close: '18:00' }, thu: { open: '09:00', close: '18:00' }, fri: { open: '09:00', close: '18:00' }, sat: null, sun: null } };
await mkdir(resolve(tenantRoot, slug), { recursive: true });
await writeTenant(slug, config);
await writeFile(resolve(tenantRoot, slug, 'hero.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#303630"/></svg>');
await writeFile(resolve(tenantRoot, slug, 'service-1.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600"><rect width="500" height="600" fill="#404840"/></svg>');
for (const [name, fill] of [['icon.svg', '#d9ff57'], ['maskable.svg', '#d9ff57'], ['apple-touch-icon.svg', '#d9ff57'], ['startup.svg', '#0d0f10']] as const) await writeFile(resolve(tenantRoot, slug, name), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="${fill}"/></svg>`);
console.log(`Created ${slug} in ${tenantRoot}`);
