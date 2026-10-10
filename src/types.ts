export type TenantMode = 'preview' | 'live';
export type Service = { id: string; name: string; description: string; durationMinutes: number; bufferMinutes: number; priceCents: number; image: string; category: string };
export type Resource = { id: string; name: string; kind: string; capacity: number };
export type TenantConfig = {
  slug: string; tenantId?: string; name: string; city: string; timezone: string; locale: string; mode: TenantMode;
  accent: string; logo: string; hero: string; description: string; phone: string; address: string;
  icon?: string; maskableIcon?: string; appleTouchIcon?: string; startupAssets?: string[];
  services: Service[]; resources: Resource[]; workingHours: Record<string, { open: string; close: string } | null>;
  social?: { instagram?: string };
};
export type BookingDraft = { service: Service; date: string; time: string; name: string; phone: string; comment: string };
export type Booking = BookingDraft & { id: string; resourceName: string; status: 'confirmed' | 'cancelled'; accessToken: string; createdAt: string };
