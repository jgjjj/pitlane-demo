import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readTenant, root } from './tenant-utils';

const slug = process.argv[2];
if (!slug) throw new Error('Usage: npm run tenant:publish -- <slug>');
try { const env = await readFile(resolve(root, '.env.local'), 'utf8'); for (const line of env.split(/\r?\n/)) { const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ''); } } catch { /* optional local env */ }
const tenant = await readTenant(slug);
if (tenant.mode !== 'live') console.log(`Publishing ${slug} in ${tenant.mode} mode; no live notifications are enabled by this script.`);
const icon = tenant.icon ?? '/icons/icon.svg'; const maskableIcon = tenant.maskableIcon ?? icon;
const manifest = { id: `/s/${slug}/`, name: tenant.name, short_name: tenant.logo, start_url: `/s/${slug}`, scope: `/s/${slug}/`, display: 'standalone', background_color: '#0d0f10', theme_color: tenant.accent, lang: tenant.locale, icons: [{ src: icon, sizes: '192x192', type: 'image/svg+xml', purpose: 'any' }, { src: maskableIcon, sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }] };
await mkdir(resolve(root, 'public', 'manifests'), { recursive: true });
await writeFile(resolve(root, 'public', 'manifests', `${slug}.webmanifest`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Published manifest for ${tenant.name}: public/manifests/${slug}.webmanifest`);

async function syncRuntime() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.log('Supabase sync skipped: set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for live runtime publishing.'); return; }
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' };
  const request = async (path: string, body: unknown) => { const response = await fetch(`${url}/rest/v1/${path}`, { method: 'POST', headers, body: JSON.stringify(body) }); if (!response.ok) throw new Error(`Supabase sync failed (${response.status}): ${await response.text()}`); return response.json() as Promise<Array<{ id: string }>>; };
  const tenantRows = await request('tenants?on_conflict=slug', [{ slug, name: tenant.name, timezone: tenant.timezone, locale: tenant.locale, mode: tenant.mode, config: tenant }]); const tenantId = tenantRows[0]?.id; if (!tenantId) throw new Error('Supabase did not return tenant id');
  await request('services?on_conflict=tenant_id,slug', tenant.services.map((service) => ({ tenant_id: tenantId, slug: service.id, name: service.name, description: service.description, duration_minutes: service.durationMinutes, buffer_minutes: service.bufferMinutes, price_cents: service.priceCents, image_path: service.image, config: { category: service.category }, active: true })));
  await request('resources?on_conflict=tenant_id,slug', tenant.resources.map((resource) => ({ tenant_id: tenantId, slug: resource.id, name: resource.name, kind: resource.kind, capacity: resource.capacity, active: true })));
  const weekdays: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  await request('business_hours?on_conflict=tenant_id,weekday', Object.entries(tenant.workingHours).map(([day, hours]) => ({ tenant_id: tenantId, weekday: weekdays[day], opens_at: hours?.open ?? null, closes_at: hours?.close ?? null })));
  console.log(`Synced ${tenant.name} runtime configuration to Supabase.`);
}
await syncRuntime();
