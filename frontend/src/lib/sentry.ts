/**
 * Sentry Configuration for React Frontend
 * Provides error tracking, performance monitoring, and user feedback
 */
import * as Sentry from "@sentry/react";

// Initialize Sentry - call this before React renders
export function initSentry() {
  // Only initialize if DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn("[Sentry] No DSN provided. Error tracking disabled.");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of transactions in dev
    
    // Session Replay (optional)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Integration configuration
    integrations: [
      // Browser tracing for performance
      Sentry.browserTracingIntegration({
        // Trace propagation to backend
        tracePropagationTargets: [
          "localhost",
          /^http:\/\/localhost:3000/,
          /^\/api/,
        ],
      }),
      // Replay integration for session recording
      Sentry.replayIntegration(),
    ],

    // Filter out noise
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      // Network errors that are expected
      "Network request failed",
      "Failed to fetch",
      "Load failed",
    ],

    // Add custom tags
    initialScope: {
      tags: {
        component: "frontend",
        app: "delineate-dashboard",
      },
    },
  });

  console.log("[Sentry] Initialized successfully");
}

// Helper to capture custom business logic errors
export function captureBusinessError(
  message: string,
  context?: Record<string, unknown>
) {
  Sentry.captureMessage(message, {
    level: "warning",
    tags: { type: "business_logic" },
    extra: context,
  });
}

// Helper to show user feedback dialog
export function showUserFeedback(eventId?: string) {
  // Use the most recent event ID if not provided
  const id = eventId || Sentry.lastEventId();
  
  if (id) {
    Sentry.showReportDialog({
      eventId: id,
      title: "It looks like we're having issues.",
      subtitle: "Our team has been notified.",
      subtitle2: "If you'd like to help, tell us what happened below.",
      labelName: "Name",
      labelEmail: "Email",
      labelComments: "What happened?",
      labelClose: "Close",
      labelSubmit: "Submit",
      successMessage: "Thank you for your feedback!",
    });
  }
}

// Helper to set user context
export function setUserContext(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

// Helper to add breadcrumb
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: "info",
    data,
  });
}

// Export Sentry for direct access
export { Sentry };
