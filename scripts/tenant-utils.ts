import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

export const root = resolve(import.meta.dirname, '..');
export const tenantRoot = resolve(root, 'public/tenants');
export const tenantSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(2), city: z.string().min(2), timezone: z.string().min(2), locale: z.string().min(2), mode: z.enum(['preview', 'live']), accent: z.string().regex(/^#[0-9a-f]{6}$/i), logo: z.string().min(1), hero: z.string().refine((value) => value.startsWith('/') || value.startsWith('https://')), icon: z.string().startsWith('/').optional(), maskableIcon: z.string().startsWith('/').optional(), appleTouchIcon: z.string().startsWith('/').optional(), startupAssets: z.array(z.string().startsWith('/')).optional(), description: z.string().min(1), phone: z.string().min(5), address: z.string().min(2),
  services: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), durationMinutes: z.number().positive(), bufferMinutes: z.number().nonnegative(), priceCents: z.number().nonnegative(), image: z.string().refine((value) => value.startsWith('/') || value.startsWith('https://')), category: z.string() })).min(1),
  resources: z.array(z.object({ id: z.string(), name: z.string(), kind: z.string(), capacity: z.number().positive() })).min(1), workingHours: z.record(z.string(), z.object({ open: z.string(), close: z.string() }).nullable())
});
export type TenantFile = z.infer<typeof tenantSchema>;
export async function readTenant(slug: string) { return tenantSchema.parse(JSON.parse(await readFile(resolve(tenantRoot, slug, 'business.json'), 'utf8'))); }
export async function writeTenant(slug: string, config: TenantFile) { await mkdir(resolve(tenantRoot, slug), { recursive: true }); await writeFile(resolve(tenantRoot, slug, 'business.json'), `${JSON.stringify(config, null, 2)}\n`); }
export async function copyAssets(from: string, to: string) { await cp(resolve(tenantRoot, from), resolve(tenantRoot, to), { recursive: true, errorOnExist: true }); }
