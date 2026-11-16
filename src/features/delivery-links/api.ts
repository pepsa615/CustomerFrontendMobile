import { apiRequest } from '@/api/client';
export type Link = { id: string; token: string; pickupSource: 'customer'|'business'; paymentBy: 'customer'|'vendor'; active: boolean; url: string };
export type Draft = { id: string; paymentStatus: string; pickup: { address: string }; delivery: { address: string }; parcel: { category: string }; amount: { currency: string; minorUnits: number }; createdAt: string };
export type Settlement = { status: string; balance: { currency: string; minorUnits: number }; entries: { id: string; direction: string; amountMinor: number; currency: string; description: string }[] };
export const linksApi = {
  createBusiness: (token: string, input: Record<string, string|number>|FormData) => apiRequest<{ business: Record<string, unknown> }>('/business', token, { method: 'POST', body: input instanceof FormData ? input : JSON.stringify(input) }),
  updateBusiness: (token: string, input: Record<string, string|number>|FormData) => apiRequest<{ business: Record<string, unknown> }>('/business', token, { method: 'PATCH', body: input instanceof FormData ? input : JSON.stringify(input) }),
  business: (token: string) => apiRequest<{ business: Record<string, unknown> }>('/business', token),
  links: (token: string) => apiRequest<Link[]>('/delivery-links', token),
  drafts: (token: string) => apiRequest<Draft[]>('/delivery-links/drafts/list', token),
  settlement: (token: string) => apiRequest<Settlement>('/delivery-links/settlement/summary', token),
  resolveLocation: (token: string, input: { latitude: number; longitude: number } | { address: string }) => apiRequest<{ latitude: number; longitude: number; formattedAddress: string }>('/account/onboarding/location', token, { method: 'POST', body: JSON.stringify(input) }),
  sendOut: (token: string, id: string, pin: string) => apiRequest<Draft>(`/delivery-links/drafts/${encodeURIComponent(id)}/send-out`, token, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ pin }) }),
};
export const money = (value: { currency: string; minorUnits: number }) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: value.currency }).format(value.minorUnits / 100);
