export const money = (cents: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(cents / 100);
export const dateLabel = (value: string) => new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
export const timeSlots = (start = 9, end = 20) => Array.from({ length: (end - start) * 2 }, (_, i) => `${String(start + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
export const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function tenantTimeSlots(workingHours: Record<string, { open: string; close: string } | null>, date: string) {
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const hours = workingHours[dayNames[new Date(`${date}T12:00:00`).getDay()]];
  if (!hours) return [];
  const [openHour, openMinute] = hours.open.split(':').map(Number); const [closeHour, closeMinute] = hours.close.split(':').map(Number);
  return Array.from({ length: Math.max(0, (closeHour * 60 + closeMinute - openHour * 60 - openMinute) / 30) }, (_, index) => { const minutes = openHour * 60 + openMinute + index * 30; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`; });
}
