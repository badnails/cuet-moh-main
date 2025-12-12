import { Activity, ExternalLink } from "lucide-react";

export function Header() {
  const jaegerUrl = import.meta.env.VITE_JAEGER_URL || "http://localhost:16686";
  const sentryUrl = import.meta.env.VITE_SENTRY_URL || "https://sentry.io";

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-50 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Observability Dashboard
              </h1>
              <p className="text-sm text-slate-400">
                CUET Fest 2025 • File Download Service
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex items-center space-x-4">
            <a
              href={jaegerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 rounded-md 
                         bg-slate-800 hover:bg-slate-700 transition-colors
                         text-sm text-slate-300"
            >
              <span>Jaeger</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={sentryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 rounded-md 
                         bg-purple-600/20 hover:bg-purple-600/30 transition-colors
                         text-sm text-purple-300"
            >
              <span>Sentry</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
