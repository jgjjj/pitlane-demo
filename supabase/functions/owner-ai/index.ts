import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { badRequest, json } from '../_shared/http.ts';
import { routeAssistantIntent } from '../_shared/ai-router.ts';

const tools = [{ type: 'function', function: { name: 'get_schedule_summary', description: 'Get schedule facts for the authenticated tenant and date range', parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] } } }];
Deno.serve(async (request) => {
  const auth = request.headers.get('Authorization'); if (!auth) return badRequest('Authentication required', 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: user } = await userClient.auth.getUser(); if (!user.user) return badRequest('Authentication required', 401);
  try {
    const body = await request.json(); if (typeof body.tenantId !== 'string' || typeof body.prompt !== 'string') return badRequest('tenantId and prompt are required');
    const { data: member } = await userClient.from('tenant_memberships').select('tenant_id').eq('tenant_id', body.tenantId).eq('user_id', user.user.id).maybeSingle(); if (!member) return badRequest('Tenant membership required', 403);
    const base = Deno.env.get('LLM_BASE_URL'); const key = Deno.env.get('LLM_API_KEY'); const model = Deno.env.get('LLM_MODEL'); if (!base || !key || !model) return json({ intent: 'unavailable', message: 'AI пока не настроен. Запись и расписание доступны без AI.' });
    const intent = routeAssistantIntent(body.prompt);
    if (intent === 'unsupported') return json({ intent, message: 'Запрос не распознан.' });
    const needsScheduleTool = intent === 'schedule';
    const messages: Array<Record<string, unknown>> = [{ role: 'system', content: 'You are an owner assistant. Never invent booking facts. Use the provided server tool before answering schedule questions. Return concise JSON intent when a request is outside the supported scope.' }, { role: 'user', content: body.prompt }];
    const { data: budgetAllowed } = await userClient.rpc('claim_llm_request', { check_tenant: body.tenantId, max_requests: 100, max_tokens: 100000, requested_tokens: 1500 });
    if (!budgetAllowed) return json({ intent: 'budget_exceeded', message: 'Лимит AI на текущий период исчерпан.' }, 429);
    let response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, messages, tools, tool_choice: 'auto', temperature: 0 }) });
    if (!response.ok) return badRequest('LLM request failed', 502);
    let result = await response.json(); const assistant = result.choices?.[0]?.message;
    if (needsScheduleTool && !assistant?.tool_calls?.length) {
      return json({ intent: 'schedule_tool_required', message: 'Для ответа о расписании нужен серверный инструмент.' }, 502);
    }
    if (assistant?.tool_calls?.length) {
      const args = JSON.parse(assistant.tool_calls[0].function.arguments) as { from: string; to: string };
      const { data: facts, error } = await userClient.from('bookings').select('starts_at,status,price_cents').eq('tenant_id', body.tenantId).gte('starts_at', args.from).lt('starts_at', args.to);
      if (error) return badRequest('Could not load schedule facts', 500);
      messages.push(assistant, { role: 'tool', tool_call_id: assistant.tool_calls[0].id, content: JSON.stringify({ bookings: facts ?? [] }) });
      response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, messages, temperature: 0 }) }); result = await response.json();
    }
    return json({ message: result.choices?.[0]?.message?.content ?? 'Не удалось сформировать ответ.', router: assistant?.tool_calls?.length ? 'tool' : 'text' });
  } catch { return badRequest('AI request is invalid'); }
});
