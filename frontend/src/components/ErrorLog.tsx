import { useState } from "react";
import { AlertTriangle, Bug, Trash2, ExternalLink } from "lucide-react";
import * as Sentry from "@sentry/react";
import api, { ApiError } from "../lib/api";
import { showUserFeedback } from "../lib/sentry";

interface ErrorEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: "api" | "client" | "sentry-test";
  details?: Record<string, unknown>;
  sentryEventId?: string;
}

export function ErrorLog() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);

  // Trigger a Sentry test error
  const triggerSentryError = async () => {
    setIsTriggering(true);

    try {
      await api.triggerSentryTest(70000);
    } catch (err) {
      const apiError = err as ApiError;
      const errorEntry: ErrorEntry = {
        id: `error-${Date.now()}`,
        timestamp: new Date(),
        message: apiError.message,
        type: "sentry-test",
        details: {
          status: apiError.status,
          requestId: apiError.requestId,
        },
        sentryEventId: apiError.sentryEventId,
      };

      setErrors((prev) => [errorEntry, ...prev]);
    } finally {
      setIsTriggering(false);
    }
  };

  // Trigger a client-side error (for testing)
  const triggerClientError = () => {
    try {
      // Intentional error
      throw new Error("Test client-side error from Observability Dashboard");
    } catch (err) {
      const eventId = Sentry.captureException(err);

      const errorEntry: ErrorEntry = {
        id: `error-${Date.now()}`,
        timestamp: new Date(),
        message: (err as Error).message,
        type: "client",
        sentryEventId: eventId,
      };

      setErrors((prev) => [errorEntry, ...prev]);

      // Optionally show feedback dialog
      showUserFeedback(eventId);
    }
  };

  // Clear all errors
  const clearErrors = () => {
    setErrors([]);
  };

  const getTypeIcon = (type: ErrorEntry["type"]) => {
    switch (type) {
      case "api":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "client":
        return <Bug className="w-4 h-4 text-red-500" />;
      case "sentry-test":
        return <Bug className="w-4 h-4 text-purple-500" />;
    }
  };

  const getTypeBadge = (type: ErrorEntry["type"]) => {
    const classes: Record<string, string> = {
      api: "badge-warning",
      client: "badge-error",
      "sentry-test": "badge-info",
    };
    return `badge ${classes[type]}`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <span>Error Log</span>
          {errors.length > 0 && (
            <span className="badge badge-error">{errors.length}</span>
          )}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={triggerClientError}
            className="btn btn-secondary text-sm flex items-center space-x-1"
          >
            <Bug className="w-4 h-4" />
            <span>Client Error</span>
          </button>
          <button
            onClick={triggerSentryError}
            disabled={isTriggering}
            className="btn btn-danger text-sm flex items-center space-x-1"
          >
            <Bug className={`w-4 h-4 ${isTriggering ? "animate-pulse" : ""}`} />
            <span>Sentry Test</span>
          </button>
          {errors.length > 0 && (
            <button
              onClick={clearErrors}
              className="p-2 rounded hover:bg-slate-700 text-slate-400"
              title="Clear errors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="card-body">
        {errors.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No errors recorded</p>
            <p className="text-sm">
              Use the test buttons above to generate sample errors
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {errors.map((error) => (
              <div
                key={error.id}
                className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 animate-fade-in"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(error.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">
                        {error.message}
                      </p>
                      <p className="text-xs text-slate-500">
                        {error.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <span className={getTypeBadge(error.type)}>
                    {error.type}
                  </span>
                </div>

                {/* Sentry Event ID */}
                {error.sentryEventId && (
                  <div className="mt-2 flex items-center space-x-2 text-xs">
                    <span className="text-slate-500">Sentry Event:</span>
                    <code className="code">{error.sentryEventId.slice(0, 16)}...</code>
                    <a
                      href={`https://sentry.io`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Details */}
                {error.details && Object.keys(error.details).length > 0 && (
                  <div className="mt-2 p-2 bg-slate-800 rounded text-xs font-mono">
                    {Object.entries(error.details).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="text-slate-500 w-24">{key}:</span>
                        <span className="text-slate-300">
                          {JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
