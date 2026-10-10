import type { Booking, BookingDraft } from '../types';

const key = (slug: string) => `pitlane:bookings:${slug}`;

export function listBookings(slug: string): Booking[] {
  try { return JSON.parse(localStorage.getItem(key(slug)) ?? '[]') as Booking[]; } catch { return []; }
}

/** Local-only storage for preview tenants. Live tenants use the create-booking Edge Function. */
export function createPreviewBooking(slug: string, draft: BookingDraft): Booking {
  const existing = listBookings(slug);
  const fingerprint = `${draft.service.id}:${draft.date}:${draft.time}:${draft.phone}`;
  const repeat = existing.find((booking) => `${booking.service.id}:${booking.date}:${booking.time}:${booking.phone}` === fingerprint);
  if (repeat) return repeat;
  const booking: Booking = { ...draft, id: `demo-${Date.now().toString(36)}`, resourceName: 'Пост 1', status: 'confirmed', accessToken: crypto.randomUUID(), createdAt: new Date().toISOString() };
  localStorage.setItem(key(slug), JSON.stringify([booking, ...existing]));
  return booking;
}

export function updatePreviewBooking(slug: string, id: string, patch: Partial<Pick<Booking, 'date' | 'time' | 'name' | 'phone' | 'comment' | 'status'>>): Booking | null {
  const bookings = listBookings(slug); const index = bookings.findIndex((booking) => booking.id === id);
  if (index < 0) return null;
  const updated = { ...bookings[index], ...patch }; bookings[index] = updated; localStorage.setItem(key(slug), JSON.stringify(bookings)); return updated;
}
