import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { badRequest, json } from '../_shared/http.ts';
import { localToUtcIso } from '../_shared/time.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json({ ok: true });
  try {
    const body = await request.json();
    for (const field of ['tenantSlug', 'serviceSlug', 'localDate', 'localTime', 'customerName', 'customerPhone', 'idempotencyKey']) if (typeof body[field] !== 'string' || !body[field]) return badRequest(`Missing ${field}`);
    const { data: runtime, error: runtimeError } = await supabase.rpc('get_public_tenant', { p_slug: body.tenantSlug });
    if (runtimeError || !runtime || typeof runtime.timezone !== 'string') return badRequest('Tenant runtime configuration unavailable', 503);
    const { data, error } = await supabase.rpc('create_booking', { p_tenant_slug: body.tenantSlug, p_service_slug: body.serviceSlug, p_starts_at: localToUtcIso(body.localDate, body.localTime, runtime.timezone), p_customer_name: body.customerName, p_customer_phone: body.customerPhone, p_customer_comment: body.customerComment ?? '', p_idempotency_key: body.idempotencyKey, p_access_token: body.accessToken ?? null });
    if (error) return badRequest(error.message, error.message.includes('NO_RESOURCE') ? 409 : 400);
    return json({ booking: data?.[0] });
  } catch { return badRequest('Invalid JSON'); }
});
