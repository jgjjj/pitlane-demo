import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../supabase/migrations/0001_core.sql', import.meta.url), 'utf8');
describe('database invariants', () => {
  it('uses one exclusion-backed occupancy table', () => { expect(sql).toContain('resource_occupancies_no_overlap exclude using gist'); expect(sql).toContain("kind in ('booking', 'block')"); });
  it('keeps tenant, price, duration and access token server-owned', () => { expect(sql).toContain('foreign key (tenant_id, service_id)'); expect(sql).toContain('price_cents bigint'); expect(sql).toContain('access_token_hash'); expect(sql).toContain('create or replace function public.create_booking'); });
  it('separates notification jobs and payment metrics', () => { expect(sql).toContain('notification_jobs'); expect(sql).toContain('price_cents'); expect(sql).toContain('usage_counters'); });
});
