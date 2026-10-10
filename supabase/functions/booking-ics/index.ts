import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { badRequest } from '../_shared/http.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
function icsText(value: string) { return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' } });
  const url = new URL(request.url); const tenantSlug = url.searchParams.get('tenantSlug'); const accessToken = url.searchParams.get('accessToken');
  if (!tenantSlug || !accessToken) return badRequest('tenantSlug and accessToken are required');
  const { data, error } = await admin.rpc('get_booking_by_token', { p_tenant_slug: tenantSlug, p_access_token: accessToken });
  if (error || !data) return badRequest('Booking not found', 404);
  const booking = data as { id: string; serviceName: string; startsAt: string; endsAt: string; status: string; address: string };
  const dt = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const body = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pitlane//Booking//EN','BEGIN:VEVENT',`UID:${booking.id}@pitlane`,`DTSTAMP:${dt(new Date().toISOString())}`,`DTSTART:${dt(booking.startsAt)}`,`DTEND:${dt(booking.endsAt)}`,`SUMMARY:${icsText(booking.serviceName)}`,`LOCATION:${icsText(booking.address ?? '')}`,`STATUS:${booking.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  return new Response(`${body}\r\n`, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="pitlane-${booking.id}.ics"`, 'access-control-allow-origin': '*' } });
});
