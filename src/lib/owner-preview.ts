import type { Service, TenantConfig } from '../types';

const key = (slug: string) => `pitlane:owner-services:${slug}`;

export function ownerServices(tenant: TenantConfig): Service[] {
  try { return JSON.parse(localStorage.getItem(key(tenant.slug)) ?? 'null') as Service[] ?? tenant.services; } catch { return tenant.services; }
}

export function saveOwnerServices(tenant: TenantConfig, services: Service[]) {
  localStorage.setItem(key(tenant.slug), JSON.stringify(services));
  window.dispatchEvent(new CustomEvent('pitlane:owner-services-changed', { detail: { slug: tenant.slug } }));
}
