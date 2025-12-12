import { useState, useEffect } from "react";
import { GitBranch, ExternalLink, Search } from "lucide-react";
import { getCurrentTraceId } from "../lib/opentelemetry";

interface Trace {
  traceId: string;
  operation: string;
  duration: number;
  timestamp: Date;
  status: "success" | "error";
}

export function TraceViewer() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const jaegerUrl = import.meta.env.VITE_JAEGER_URL || "http://localhost:16686";

  // Update current trace ID periodically
  useEffect(() => {
    const updateTraceId = () => {
      setCurrentTraceId(getCurrentTraceId());
    };
    
    updateTraceId();
    const interval = setInterval(updateTraceId, 1000);
    return () => clearInterval(interval);
  }, []);

  // Add trace from API events
  const addTrace = (operation: string, duration: number, status: "success" | "error", traceId?: string) => {
    const trace: Trace = {
      traceId: traceId || currentTraceId || `trace-${Date.now()}`,
      operation,
      duration,
      timestamp: new Date(),
      status,
    };
    setTraces((prev) => [trace, ...prev.slice(0, 49)]); // Keep last 50
  };

  // Listen for API trace events
  useEffect(() => {
    const handleTrace = (event: CustomEvent) => {
      const { operation, duration, success, traceId } = event.detail;
      addTrace(operation, duration, success ? "success" : "error", traceId);
    };

    window.addEventListener("api-trace" as never, handleTrace as never);
    return () => window.removeEventListener("api-trace" as never, handleTrace as never);
  }, [currentTraceId]);

  const filteredTraces = traces.filter(
    (trace) =>
      trace.operation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trace.traceId.includes(searchQuery)
  );

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-blue-500" />
          <span>Trace Viewer</span>
        </h2>
        <a
          href={jaegerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary text-sm flex items-center space-x-1"
        >
          <span>Jaeger UI</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      <div className="card-body space-y-4">
        {/* Current Trace ID */}
        {currentTraceId && (
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-blue-400 font-medium">Active Trace ID</p>
            <code className="text-sm text-slate-300 font-mono">
              {currentTraceId}
            </code>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search traces..."
            className="input w-full pl-10"
          />
        </div>

        {/* Traces List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredTraces.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No traces recorded</p>
              <p className="text-sm">
                API calls will appear here with their trace IDs
              </p>
            </div>
          ) : (
            filteredTraces.map((trace, index) => (
              <div
                key={`${trace.traceId}-${index}`}
                className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">
                      {trace.operation}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <code className="font-mono">
                        {trace.traceId.slice(0, 16)}...
                      </code>
                      <span>•</span>
                      <span>{trace.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm font-mono ${
                        trace.duration > 1000
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {trace.duration}ms
                    </span>
                    <span
                      className={`badge ${
                        trace.status === "success"
                          ? "badge-success"
                          : "badge-error"
                      }`}
                    >
                      {trace.status}
                    </span>
                    <a
                      href={`${jaegerUrl}/trace/${trace.traceId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-slate-700 text-slate-400"
                      title="View in Jaeger"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
