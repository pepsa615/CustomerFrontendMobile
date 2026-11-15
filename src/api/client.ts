import Constants from 'expo-constants';
import { SpanStatusCode } from '@opentelemetry/api';
import { mobileTracer } from '@/telemetry';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:4000/v1';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) { super(message); }
}

export async function apiRequest<T>(path: string, accessToken?: string, init: RequestInit = {}): Promise<T> {
  const span = mobileTracer.startSpan('api.request', { attributes: { 'http.request.method': init.method ?? 'GET', 'url.template': path } });
  let response: Response;
  try { response = await fetch(`${apiUrl}${path}`, { ...init, headers: { ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }), 'x-request-id': crypto.randomUUID(), ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}), ...init.headers } }); }
  catch (error) { if (error instanceof Error) span.recordException(error); span.setStatus({code:SpanStatusCode.ERROR}); span.end(); throw error; }
  const body = await response.json().catch(() => null) as { data?: T; error?: { code?: string; message?: string; details?: unknown } } | null;
  span.setAttribute('http.response.status_code', response.status);
  if (!response.ok) { span.setStatus({ code: SpanStatusCode.ERROR }); span.end(); throw new ApiError(response.status, body?.error?.code ?? 'REQUEST_FAILED', body?.error?.message ?? 'Request failed', body?.error?.details); }
  span.setStatus({ code: SpanStatusCode.OK }); span.end(); return (body?.data ?? body) as T;
}
