export type AssistantIntent = 'schedule' | 'general' | 'unsupported';

export function routeAssistantIntent(prompt: string): AssistantIntent {
  if (/запис|заезд|расписан|booking|schedule|appointment/i.test(prompt)) return 'schedule';
  if (prompt.trim().length > 0) return 'general';
  return 'unsupported';
}

export function parseJsonIntent(value: unknown): { intent: string; from?: string; to?: string } | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (typeof parsed.intent !== 'string') return null;
    return { intent: parsed.intent, from: typeof parsed.from === 'string' ? parsed.from : undefined, to: typeof parsed.to === 'string' ? parsed.to : undefined };
  } catch { return null; }
}
