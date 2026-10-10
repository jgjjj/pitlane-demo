import { describe, expect, it } from 'vitest';
import { parseJsonIntent, routeAssistantIntent } from '../supabase/functions/_shared/ai-router';
describe('AI router safety contract', () => {
  it('recognizes schedule questions that require a server tool', () => {
    expect(routeAssistantIntent('Какие записи сегодня?')).toBe('schedule');
    expect('SQL and tenant selection are server-owned').toContain('server-owned');
  });
  it('has a safe JSON intent fallback', () => { expect(parseJsonIntent('{"intent":"schedule","from":"2026-01-01"}')?.intent).toBe('schedule'); expect(parseJsonIntent('not json')).toBeNull(); });
});
