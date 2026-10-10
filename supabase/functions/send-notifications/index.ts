import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json } from '../_shared/http.ts';
import webpush from 'npm:web-push@3.6.7';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async () => {
  const { data: jobs } = await admin.rpc('claim_notification_jobs', { p_limit: 50 });
  const results = [];
  for (const job of jobs ?? []) {
    if (job.channel === 'ics') { await admin.from('notification_jobs').update({ status: 'available', lease_until: null, payload: { ...(job.payload ?? {}), delivery: 'on_demand' } }).eq('id', job.id); results.push({ id: job.id, status: 'available_on_demand' }); continue; }
    if (job.channel === 'push') {
      const publicKey = Deno.env.get('VAPID_PUBLIC_KEY'); const privateKey = Deno.env.get('VAPID_PRIVATE_KEY'); const subject = Deno.env.get('VAPID_SUBJECT');
      if (!publicKey || !privateKey || !subject) { await admin.from('notification_jobs').update({ status: 'failed', last_error: 'VAPID is not configured', lease_until: null }).eq('id', job.id); results.push({ id: job.id, status: 'failed_no_vapid' }); continue; }
      webpush.setVapidDetails(subject, publicKey, privateKey);
      const { data: subscriptions } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('tenant_id', job.tenant_id);
      const payload = JSON.stringify({ title: 'Новая запись', body: 'В расписании появилась запись.', url: `/s/${job.payload?.tenantSlug ?? job.tenant_id}/owner` });
      for (const subscription of subscriptions ?? []) { try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload); } catch (error) { const statusCode = (error as { statusCode?: number }).statusCode; if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id); } }
      await admin.from('notification_jobs').update({ status: 'sent', lease_until: null }).eq('id', job.id); results.push({ id: job.id, status: 'sent' }); continue;
    }
    await admin.from('notification_jobs').update({ status: 'failed', last_error: 'Unsupported notification channel', lease_until: null }).eq('id', job.id); results.push({ id: job.id, status: 'failed_channel' });
  }
  return json({ processed: results });
});
