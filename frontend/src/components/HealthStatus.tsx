import { RefreshCw, CheckCircle, XCircle, AlertCircle, HardDrive } from "lucide-react";
import type { HealthResponse } from "../lib/api";

interface HealthStatusProps {
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function HealthStatus({ health, loading, error, onRefresh }: HealthStatusProps) {
  const isHealthy = health?.status === "healthy";
  const storageOk = health?.checks?.storage === "ok";

  return (
    <div className="card h-full">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
          <span>System Health</span>
        </h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
          title="Refresh health status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="card-body">
        {error ? (
          <div className="flex items-center space-x-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-medium text-red-400">Connection Error</p>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
          </div>
        ) : loading && !health ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Status */}
            <div
              className={`flex items-center space-x-3 p-4 rounded-lg border ${
                isHealthy
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-red-500/10 border-red-500/20"
              }`}
            >
              {isHealthy ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-500" />
              )}
              <div>
                <p className={`font-medium ${isHealthy ? "text-green-400" : "text-red-400"}`}>
                  {isHealthy ? "All Systems Operational" : "System Degraded"}
                </p>
                <p className="text-sm text-slate-400">
                  API Status: {health?.status || "unknown"}
                </p>
              </div>
            </div>

            {/* Individual Checks */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Service Checks
              </h3>
              
              {/* Storage Check */}
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Storage (S3/MinIO)</span>
                </div>
                <span
                  className={`badge ${
                    storageOk ? "badge-success" : "badge-error"
                  }`}
                >
                  {storageOk ? "OK" : "Error"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
