import { useState, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/react";

// Components
import { Header } from "./components/Header";
import { HealthStatus } from "./components/HealthStatus";
import { DownloadJobs } from "./components/DownloadJobs";
import { ErrorLog } from "./components/ErrorLog";
import { TraceViewer } from "./components/TraceViewer";
import { PerformanceMetrics } from "./components/PerformanceMetrics";

// Types
import type { HealthResponse } from "./lib/api";
import api from "./lib/api";

// Error boundary fallback
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-red-400">
            Something went wrong
          </h2>
        </div>
        <div className="card-body space-y-4">
          <p className="text-slate-400">
            An unexpected error occurred. This has been reported to our team.
          </p>
          <div className="bg-slate-900 rounded p-3">
            <code className="text-sm text-red-400">{error.message}</code>
          </div>
          <button onClick={resetErrorBoundary} className="btn btn-primary w-full">
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App component
function AppContent() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Fetch health status
  const fetchHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch health";
      setHealthError(message);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchHealth();
    
    // Poll health every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Top row - Health & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <HealthStatus
              health={health}
              loading={healthLoading}
              error={healthError}
              onRefresh={fetchHealth}
            />
          </div>
          <div className="lg:col-span-2">
            <PerformanceMetrics />
          </div>
        </div>

        {/* Middle row - Download Jobs & Trace Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DownloadJobs />
          <TraceViewer />
        </div>

        {/* Bottom row - Error Log */}
        <ErrorLog />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>
            CUET Fest 2025 Hackathon • Observability Dashboard •{" "}
            <a
              href="https://sentry.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Powered by Sentry
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Wrap with Sentry Error Boundary
function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetErrorBoundary={resetError} />
      )}
      showDialog
    >
      <AppContent />
    </Sentry.ErrorBoundary>
  );
}

export default App;
