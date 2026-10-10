import { z } from 'zod';
import type { TenantConfig } from '../types';
import { supabase } from './supabase';

const serviceSchema = z.object({ id: z.string(), name: z.string(), description: z.string(), durationMinutes: z.number(), bufferMinutes: z.number(), priceCents: z.number(), image: z.string(), category: z.string() });
const assetPath = z.string().refine((value) => value.startsWith('/') || value.startsWith('https://'), 'Asset must be local or HTTPS');
const tenantSchema = z.object({ slug: z.string(), tenantId: z.string().uuid().optional(), name: z.string(), city: z.string(), timezone: z.string(), locale: z.string(), mode: z.enum(['preview', 'live']), accent: z.string(), logo: z.string(), hero: assetPath, description: z.string(), phone: z.string(), address: z.string(), icon: z.string().optional(), maskableIcon: z.string().optional(), appleTouchIcon: z.string().optional(), startupAssets: z.array(z.string()).optional(), services: z.array(serviceSchema.extend({ image: assetPath })), resources: z.array(z.object({ id: z.string(), name: z.string(), kind: z.string(), capacity: z.number() })), workingHours: z.record(z.string(), z.object({ open: z.string(), close: z.string() }).nullable()), social: z.object({ instagram: z.string().optional() }).optional() });

export const genericTenant: TenantConfig = { slug: 'default', name: 'Студия', city: 'Ваш город', timezone: 'Europe/Moscow', locale: 'ru-RU', mode: 'preview', accent: '#d9ff57', logo: 'STUDIO', hero: '/tenants/default/hero.svg', description: 'Уход за автомобилем с вниманием к деталям.', phone: '+7 000 000-00-00', address: 'Адрес студии', services: [], resources: [], workingHours: {} };

export async function loadTenant(slug: string): Promise<TenantConfig> {
  if (supabase) {
    const { data, error } = await supabase.rpc('get_public_tenant', { p_slug: slug });
    if (!error && data) return tenantSchema.parse(fromRuntimeConfig(data as Record<string, unknown>));
    if (error && import.meta.env.PROD) throw new Error('Не удалось загрузить настройки студии');
  }
  const response = await fetch(`/tenants/${encodeURIComponent(slug)}/business.json`);
  if (!response.ok) throw new Error('Студия не найдена');
  return tenantSchema.parse(await response.json());
}

function fromRuntimeConfig(value: Record<string, unknown>): TenantConfig {
  const config = (value.config ?? {}) as Record<string, unknown>;
  return { ...config, ...value, services: value.services, resources: value.resources, workingHours: normalizeWorkingHours(value.workingHours) } as TenantConfig;
}

function normalizeWorkingHours(value: unknown): TenantConfig['workingHours'] {
  if (!value || typeof value !== 'object') return {};
  const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return Object.fromEntries(Object.entries(value as Record<string, { open?: string; close?: string }>).map(([key, hours]) => [names[Number(key)] ?? key, hours?.open && hours?.close ? { open: hours.open.slice(0, 5), close: hours.close.slice(0, 5) } : null]));
}

export function tenantFromPath(pathname: string): string {
  const match = pathname.match(/^\/s\/([^/]+)/);
  return match?.[1] ?? import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'graphite';
}
