/**
 * API Service Layer
 * Handles all communication with the backend API
 * Includes tracing and error handling
 */
import { withSpan, getCurrentTraceId } from "./opentelemetry";
import { addBreadcrumb, captureBusinessError } from "./sentry";

// Types
export interface HealthResponse {
  status: "healthy" | "unhealthy";
  checks: {
    storage: "ok" | "error";
  };
}

export interface DownloadInitiateRequest {
  file_ids: number[];
}

export interface DownloadInitiateResponse {
  jobId: string;
  status: "queued" | "processing";
  totalFileIds: number;
}

export interface DownloadCheckRequest {
  file_id: number;
}

export interface DownloadCheckResponse {
  file_id: number;
  available: boolean;
  s3Key: string | null;
  size: number | null;
}

export interface DownloadStartRequest {
  file_id: number;
}

export interface DownloadStartResponse {
  file_id: number;
  status: "completed" | "failed";
  downloadUrl: string | null;
  size: number | null;
  processingTimeMs: number;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  requestId?: string;
  sentryEventId?: string;
}

// API base URL - uses proxy in dev, direct in prod
const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Emit custom events for dashboard components
function emitApiEvent(operation: string, duration: number, success: boolean, traceId?: string | null) {
  // For PerformanceMetrics component
  window.dispatchEvent(new CustomEvent("api-call", {
    detail: { duration, success }
  }));
  
  // For TraceViewer component
  window.dispatchEvent(new CustomEvent("api-trace", {
    detail: { operation, duration, success, traceId }
  }));
}

// Generic fetch wrapper with tracing
async function fetchWithTracing<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const traceId = getCurrentTraceId();
  const startTime = performance.now();
  const operation = `HTTP ${options.method || "GET"} ${endpoint}`;

  return withSpan(
    operation,
    async (span) => {
      // Add span attributes
      span.setAttribute("http.url", url);
      span.setAttribute("http.method", options.method || "GET");

      // Add breadcrumb for Sentry
      addBreadcrumb(
        `API Request: ${options.method || "GET"} ${endpoint}`,
        "http",
        { url, traceId }
      );

      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(traceId && { "X-Trace-ID": traceId }),
            ...options.headers,
          },
        });

        const duration = Math.round(performance.now() - startTime);
        span.setAttribute("http.status_code", response.status);

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({
            message: "Unknown error",
          }))) as ErrorResponse;

          // Emit event for dashboard
          emitApiEvent(operation, duration, false, traceId);

          // Log business error to Sentry
          captureBusinessError(`API Error: ${endpoint}`, {
            status: response.status,
            error: errorData,
            traceId,
          });

          throw new ApiError(
            errorData.message || `HTTP ${response.status}`,
            response.status,
            errorData.requestId,
            errorData.sentryEventId
          );
        }

        // Emit success event for dashboard
        emitApiEvent(operation, duration, true, traceId);

        return response.json() as Promise<T>;
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        
        // If it's not an ApiError (network error), emit failure event
        if (!(error instanceof ApiError)) {
          emitApiEvent(operation, duration, false, traceId);
        }
        
        throw error;
      }
    },
    { "api.endpoint": endpoint }
  );
}

// Custom API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId?: string,
    public sentryEventId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// API Methods
export const api = {
  // Health check
  async getHealth(): Promise<HealthResponse> {
    return fetchWithTracing<HealthResponse>("/health");
  },

  // Initiate download job
  async initiateDownload(
    fileIds: number[]
  ): Promise<DownloadInitiateResponse> {
    return fetchWithTracing<DownloadInitiateResponse>("/v1/download/initiate", {
      method: "POST",
      body: JSON.stringify({ file_ids: fileIds }),
    });
  },

  // Check file availability
  async checkDownload(
    fileId: number,
    sentryTest = false
  ): Promise<DownloadCheckResponse> {
    const query = sentryTest ? "?sentry_test=true" : "";
    return fetchWithTracing<DownloadCheckResponse>(
      `/v1/download/check${query}`,
      {
        method: "POST",
        body: JSON.stringify({ file_id: fileId }),
      }
    );
  },

  // Start download (long-running)
  async startDownload(fileId: number): Promise<DownloadStartResponse> {
    return fetchWithTracing<DownloadStartResponse>("/v1/download/start", {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    });
  },

  // Trigger Sentry test error
  async triggerSentryTest(fileId: number = 70000): Promise<never> {
    return fetchWithTracing<never>("/v1/download/check?sentry_test=true", {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    });
  },
};

export default api;
