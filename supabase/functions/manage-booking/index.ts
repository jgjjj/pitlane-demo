import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { badRequest, json } from '../_shared/http.ts';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
Deno.serve(async (request) => {
  try {
    const body = await request.json(); const action = body.action;
    if (!['cancel', 'reschedule'].includes(action) || typeof body.tenantSlug !== 'string' || typeof body.bookingId !== 'string' || typeof body.accessToken !== 'string') return badRequest('Invalid booking action');
    const rpc = action === 'cancel' ? 'cancel_booking' : 'reschedule_booking'; const args = action === 'cancel' ? { p_tenant_slug: body.tenantSlug, p_booking_id: body.bookingId, p_access_token: body.accessToken } : { p_tenant_slug: body.tenantSlug, p_booking_id: body.bookingId, p_access_token: body.accessToken, p_starts_at: body.startsAt };
    const { data, error } = await supabase.rpc(rpc, args); if (error) return badRequest(error.message, error.message.includes('NO_RESOURCE') ? 409 : 400); return json({ result: data });
  } catch { return badRequest('Invalid JSON'); }
});
