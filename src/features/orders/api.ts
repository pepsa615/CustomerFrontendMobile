import { apiRequest } from '@/api/client';
export type OrderStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'PAYMENT_PROCESSING'
  | 'PENDING'
  | 'PAIRED'
  | 'PICKUP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLATION_PROCESSING'
  | 'CANCELLED'
  | 'FAILED';
export type Address = {
  address: string;
  city: string;
  state: string;
  country: string;
  landmark?: string;
  contactName: string;
  contactPhone: string;
};
export type Order = {
  id: string;
  status: OrderStatus;
  paymentStatus: string;
  deliveryType: string;
  mobilityMethod?: string;
  orderKind: 'STANDARD' | 'LARGE_COURIER';
  pickup: Address;
  delivery: Address;
  parcel: { category: string };
  amount: { currency: string; minorUnits: number };
  distanceKm?: number;
  durationSeconds?: number;
  createdAt: string;
};
export type QuoteInput = {
  deliveryType: string;
  mobilityMethod?: string;
  pickup: ProviderAddress;
  delivery: ProviderAddress;
  parcel: {
    category: string;
    description?: string;
    weightKg: number;
    dimensionsCm: { length: number; width: number; height: number };
    handling: string;
    insuranceConsent?: boolean;
  };
};
export type QuickQuoteInput = {
  mobilityMethod?: string;
  pickup: {
    address: string;
    city: string;
    state: string;
    country?: string;
    landmark?: string;
  };
  delivery: {
    address: string;
    city: string;
    state: string;
    country?: string;
    landmark?: string;
  };
  parcel: { category: string };
  scheduledAt?: string;
  returnOrder: boolean;
  termsAccepted: true;
  packageImageAssetId?: string;
};
export type OrderDetailsPatch = Partial<
  Pick<QuoteInput, 'pickup' | 'delivery' | 'parcel'>
> & { pickupLandmark?: string; deliveryLandmark?: string };
type ProviderAddress = {
  address: string;
  city: string;
  state: string;
  country: string;
  landmark?: string;
  contact: { name: string; phone: string };
};
export const ordersApi = {
  options: (token: string) =>
    apiRequest<{
      categories: string[];
      handlingModes: string[];
      lastMileVehicles: string[];
      vehiclesByCategory?: Record<string, string[]>;
    }>('/orders/options', token),
  uploadMedia: (token: string, uri: string) => {
    const body = new FormData();
    body.append('photo', {
      uri,
      name: 'package.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    return apiRequest<{ id: string }>('/orders/media', token, {
      method: 'POST',
      body,
    });
  },
  list: (token: string) => apiRequest<Order[]>('/orders', token),
  get: (token: string, id: string) =>
    apiRequest<Order>(`/orders/${encodeURIComponent(id)}`, token),
  quote: (token: string, input: QuoteInput) =>
    apiRequest<Order>('/orders/quotes', token, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  quickQuote: (token: string, input: QuickQuoteInput) =>
    apiRequest<Order>('/orders/quotes/quick', token, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateDetails: (token: string, id: string, patch: OrderDetailsPatch) =>
    apiRequest<Order>(`/orders/${encodeURIComponent(id)}/details`, token, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deliveryCode: (token: string, id: string) =>
    apiRequest<{ code: string }>(
      `/orders/${encodeURIComponent(id)}/delivery-code`,
      token,
    ),
  confirmPickup: (token: string, id: string, code: string) =>
    apiRequest<Order>(
      `/orders/${encodeURIComponent(id)}/confirm-pickup`,
      token,
      { method: 'POST', body: JSON.stringify({ code }) },
    ),
  pay: (token: string, id: string, pin: string) =>
    apiRequest<Order>(`/orders/${encodeURIComponent(id)}/pay`, token, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ pin }),
    }),
  cancel: (token: string, id: string, reason: string) =>
    apiRequest<Order>(`/orders/${encodeURIComponent(id)}/cancel`, token, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ reason }),
    }),
  tracking: (token: string, id: string) =>
    apiRequest<{
      latitude?: number;
      longitude?: number;
      rider?: {
        name?: string;
        phone?: string;
        vehicle?: string;
        registration?: string;
        rating?: number;
      };
    }>(`/orders/${encodeURIComponent(id)}/tracking`, token),
  report: (token: string, id: string, category: string, description: string) =>
    apiRequest<{ reference: string }>(
      `/orders/${encodeURIComponent(id)}/reports`,
      token,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ category, description }),
      },
    ),
};
export const money = (value: Order['amount']) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: value.currency,
  }).format(value.minorUnits / 100);
