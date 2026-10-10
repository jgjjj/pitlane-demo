import { beforeEach, describe, expect, it } from 'vitest';
import { createPreviewBooking, listBookings } from '../src/lib/booking';

const service = { id: 'ceramic', name: 'Керамика', description: '', durationMinutes: 60, bufferMinutes: 15, priceCents: 1000, image: '', category: 'Защита' };
beforeEach(() => localStorage.clear());
describe('preview booking contract', () => {
  it('is idempotent for the same tenant/service/slot/customer', () => {
    const draft = { service, date: '2026-10-12', time: '10:00', name: 'Анна', phone: '+79990000000', comment: '' };
    const first = createPreviewBooking('graphite', draft); const second = createPreviewBooking('graphite', draft);
    expect(second.id).toBe(first.id); expect(listBookings('graphite')).toHaveLength(1);
  });
  it('isolates bookings by tenant', () => {
    const draft = { service, date: '2026-10-12', time: '10:00', name: 'Анна', phone: '+79990000000', comment: '' };
    createPreviewBooking('graphite', draft); expect(listBookings('oxide')).toHaveLength(0);
  });
});
