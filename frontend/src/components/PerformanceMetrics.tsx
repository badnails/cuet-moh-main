import { useState, useEffect } from "react";
import { Activity, TrendingUp, Clock, Zap, BarChart3 } from "lucide-react";

interface Metric {
  name: string;
  value: number;
  unit: string;
  trend?: "up" | "down" | "stable";
  icon: React.ReactNode;
}

export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      name: "Avg Response Time",
      value: 0,
      unit: "ms",
      trend: "stable",
      icon: <Clock className="w-5 h-5 text-blue-400" />,
    },
    {
      name: "Requests/min",
      value: 0,
      unit: "",
      trend: "up",
      icon: <TrendingUp className="w-5 h-5 text-green-400" />,
    },
    {
      name: "Error Rate",
      value: 0,
      unit: "%",
      trend: "down",
      icon: <Activity className="w-5 h-5 text-yellow-400" />,
    },
    {
      name: "Active Connections",
      value: 1,
      unit: "",
      trend: "stable",
      icon: <Zap className="w-5 h-5 text-purple-400" />,
    },
  ]);

  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Simulate metrics collection
  useEffect(() => {
    const collectMetrics = () => {
      // Calculate average response time
      const avgResponseTime =
        responseTimes.length > 0
          ? Math.round(
              responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            )
          : 0;

      // Calculate error rate
      const errorRate =
        requestCount > 0 ? Math.round((errorCount / requestCount) * 100) : 0;

      setMetrics([
        {
          name: "Avg Response Time",
          value: avgResponseTime,
          unit: "ms",
          trend: avgResponseTime > 500 ? "up" : "stable",
          icon: <Clock className="w-5 h-5 text-blue-400" />,
        },
        {
          name: "Requests/min",
          value: requestCount,
          unit: "",
          trend: requestCount > 10 ? "up" : "stable",
          icon: <TrendingUp className="w-5 h-5 text-green-400" />,
        },
        {
          name: "Error Rate",
          value: errorRate,
          unit: "%",
          trend: errorRate > 5 ? "up" : errorRate === 0 ? "down" : "stable",
          icon: <Activity className="w-5 h-5 text-yellow-400" />,
        },
        {
          name: "Active Connections",
          value: 1,
          unit: "",
          trend: "stable",
          icon: <Zap className="w-5 h-5 text-purple-400" />,
        },
      ]);
    };

    collectMetrics();
    const interval = setInterval(collectMetrics, 5000);
    return () => clearInterval(interval);
  }, [responseTimes, requestCount, errorCount]);

  // Listen for performance events from API calls
  useEffect(() => {
    const handleApiCall = (event: CustomEvent) => {
      const { duration, success } = event.detail;
      setResponseTimes((prev) => [...prev.slice(-99), duration]);
      setRequestCount((prev) => prev + 1);
      if (!success) {
        setErrorCount((prev) => prev + 1);
      }
    };

    window.addEventListener("api-call" as never, handleApiCall as never);
    return () => window.removeEventListener("api-call" as never, handleApiCall as never);
  }, []);

  // No initial data - metrics are populated from real API calls

  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    if (!trend) return null;

    const colors: Record<string, string> = {
      up: "text-green-400",
      down: "text-red-400",
      stable: "text-slate-400",
    };

    return (
      <span className={`text-xs ${colors[trend]}`}>
        {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
      </span>
    );
  };

  return (
    <div className="card h-full">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <span>Performance Metrics</span>
        </h2>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.name}
              className="p-4 bg-slate-900/50 rounded-lg border border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                {metric.icon}
                {getTrendIcon(metric.trend)}
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {metric.value}
                <span className="text-sm font-normal text-slate-400 ml-1">
                  {metric.unit}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">{metric.name}</p>
            </div>
          ))}
        </div>

        {/* Simple Bar Chart Visualization */}
        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            Response Time Distribution
          </h3>
          <div className="flex items-end space-x-1 h-20">
            {responseTimes.slice(-20).map((time, index) => {
              const maxTime = Math.max(...responseTimes.slice(-20), 200);
              const height = (time / maxTime) * 100;
              const color =
                time > 500
                  ? "bg-red-500"
                  : time > 200
                  ? "bg-yellow-500"
                  : "bg-green-500";
              return (
                <div
                  key={index}
                  className={`flex-1 ${color} rounded-t transition-all duration-300`}
                  style={{ height: `${height}%` }}
                  title={`${time}ms`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>Recent</span>
            <span>Now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
