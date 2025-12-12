import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";

// Create a custom registry
export const metricsRegistry = new Registry();

// Add default metrics (Node.js runtime metrics)
collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "app_",
});

// ============================================
// HTTP Metrics
// ============================================

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"] as const,
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status"] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

export const httpActiveRequests = new Gauge({
  name: "http_active_requests",
  help: "Number of active HTTP requests",
  registers: [metricsRegistry],
});

// ============================================
// Download Metrics
// ============================================

export const downloadsInitiated = new Counter({
  name: "downloads_initiated_total",
  help: "Total number of downloads initiated",
  registers: [metricsRegistry],
});

export const downloadsCompleted = new Counter({
  name: "downloads_completed_total",
  help: "Total number of downloads completed successfully",
  registers: [metricsRegistry],
});

export const downloadsFailed = new Counter({
  name: "downloads_failed_total",
  help: "Total number of downloads that failed",
  labelNames: ["reason"] as const,
  registers: [metricsRegistry],
});

export const downloadDuration = new Histogram({
  name: "download_duration_seconds",
  help: "Download processing duration in seconds",
  buckets: [5, 10, 15, 30, 45, 60, 90, 120, 180, 300],
  registers: [metricsRegistry],
});

export const activeDownloads = new Gauge({
  name: "active_downloads",
  help: "Number of downloads currently in progress",
  registers: [metricsRegistry],
});

// ============================================
// S3 Metrics
// ============================================

export const s3OperationsTotal = new Counter({
  name: "s3_operations_total",
  help: "Total number of S3 operations",
  labelNames: ["operation", "status"] as const,
  registers: [metricsRegistry],
});

export const s3OperationDuration = new Histogram({
  name: "s3_operation_duration_seconds",
  help: "S3 operation duration in seconds",
  labelNames: ["operation"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

// ============================================
// Rate Limiting Metrics
// ============================================

export const rateLimitHits = new Counter({
  name: "rate_limit_hits_total",
  help: "Total number of requests that hit rate limiting",
  registers: [metricsRegistry],
});

// ============================================
// Convenience Exports & Helper Functions
// ============================================

// Alias for the registry (used in index.ts)
export const register = metricsRegistry;

// HTTP middleware for Hono
import type { Context, Next } from "hono";

export const httpMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  httpActiveRequests.inc();

  await next();

  const duration = (Date.now() - start) / 1000;
  const path = new URL(c.req.url).pathname;
  const method = c.req.method;
  const status = String(c.res.status);

  httpRequestsTotal.inc({ method, path, status });
  httpRequestDuration.observe({ method, path, status }, duration);
  httpActiveRequests.dec();
};

// Download helper functions
export const downloadStarted = () => {
  downloadsInitiated.inc();
  activeDownloads.inc();
};

export const downloadCompleted = (durationSeconds: number) => {
  downloadsCompleted.inc();
  activeDownloads.dec();
  downloadDuration.observe(durationSeconds);
};

export const downloadFailed = (reason = "unknown") => {
  downloadsFailed.inc({ reason });
  activeDownloads.dec();
};

// S3 operation timer factory
export const s3OperationTimer = (operation: string) => {
  const start = Date.now();
  return (success = true) => {
    const duration = (Date.now() - start) / 1000;
    s3OperationsTotal.inc({ operation, status: success ? "success" : "error" });
    s3OperationDuration.observe({ operation }, duration);
  };
};
