/**
 * OpenTelemetry Configuration for React Frontend
 * Provides distributed tracing with trace propagation to backend
 */
import { trace, context, SpanStatusCode, type Span } from "@opentelemetry/api";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

let provider: WebTracerProvider | null = null;
let currentTraceId: string | null = null;

// Initialize OpenTelemetry
export function initOpenTelemetry() {
  const otlpEndpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;

  // Create resource with service name
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "delineate-dashboard-frontend",
  });

  // Create trace provider
  provider = new WebTracerProvider({ resource });

  // Configure OTLP exporter if endpoint is provided
  if (otlpEndpoint) {
    const exporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    });
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    console.log("[OpenTelemetry] OTLP exporter configured:", otlpEndpoint);
  } else {
    console.log("[OpenTelemetry] No OTLP endpoint - tracing to console only");
  }

  // Register the provider
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  // Setup fetch instrumentation for automatic trace propagation
  const fetchInstrumentation = new FetchInstrumentation({
    propagateTraceHeaderCorsUrls: [
      /localhost/,
      /127\.0\.0\.1/,
      /^\/api/,
    ],
    clearTimingResources: true,
  });

  fetchInstrumentation.setTracerProvider(provider);
  fetchInstrumentation.enable();

  console.log("[OpenTelemetry] Initialized successfully");
}

// Get tracer instance
export function getTracer(name = "delineate-dashboard") {
  return trace.getTracer(name);
}

// Create a custom span for user interactions
export function startSpan(name: string, attributes?: Record<string, string>) {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });
  
  // Store trace ID for display
  const spanContext = span.spanContext();
  currentTraceId = spanContext.traceId;
  
  return span;
}

// End a span
export function endSpan(span: Span, error?: Error) {
  if (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }
  span.end();
}

// Get current trace ID for display
export function getCurrentTraceId(): string | null {
  return currentTraceId;
}

// Wrapper for async operations with tracing
export async function withSpan<T>(
  name: string,
  operation: (span: Span) => Promise<T>,
  attributes?: Record<string, string>
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });
  
  // Store trace ID
  const spanContext = span.spanContext();
  currentTraceId = spanContext.traceId;

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

// Shutdown provider
export function shutdownOpenTelemetry() {
  if (provider) {
    provider.shutdown();
  }
}

// Export for direct access
export { trace, context, SpanStatusCode };
