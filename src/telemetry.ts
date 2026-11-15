import { trace } from '@opentelemetry/api';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let started = false;
export function startTelemetry() {
  const endpoint = process.env.EXPO_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint || started) return;
  started = true;
  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'pepsa-customer-mobile' }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }))],
  });
  trace.setGlobalTracerProvider(provider);
}
export const mobileTracer = trace.getTracer('pepsa-customer-mobile');
