export function localToUtcIso(date: string, time: string, timezone: string): string {
  const naive = new Date(`${date}T${time}:00.000Z`);
  const getParts = (value: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(value).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  const parts = getParts(naive);
  const displayedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(naive.getTime() - (displayedAsUtc - naive.getTime())).toISOString();
}
