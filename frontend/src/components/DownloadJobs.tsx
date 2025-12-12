import { useState } from "react";
import {
  Download,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import api, { DownloadInitiateResponse, DownloadStartResponse, ApiError } from "../lib/api";
import { addBreadcrumb } from "../lib/sentry";

interface DownloadJob {
  id: string;
  fileIds: number[];
  status: "queued" | "processing" | "completed" | "failed";
  results?: DownloadStartResponse[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export function DownloadJobs() {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [fileIdsInput, setFileIdsInput] = useState("1, 2, 3");
  const [isInitiating, setIsInitiating] = useState(false);

  // Initiate a new download job
  const initiateJob = async () => {
    const fileIds = fileIdsInput
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (fileIds.length === 0) {
      return;
    }

    setIsInitiating(true);
    addBreadcrumb("Initiating download job", "user", { fileIds });

    try {
      const response: DownloadInitiateResponse = await api.initiateDownload(fileIds);

      const newJob: DownloadJob = {
        id: response.jobId,
        fileIds,
        status: response.status,
        startedAt: new Date(),
      };

      setJobs((prev) => [newJob, ...prev]);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : "Failed to initiate job";
      
      const failedJob: DownloadJob = {
        id: `failed-${Date.now()}`,
        fileIds,
        status: "failed",
        error: errorMessage,
        startedAt: new Date(),
        completedAt: new Date(),
      };

      setJobs((prev) => [failedJob, ...prev]);
    } finally {
      setIsInitiating(false);
    }
  };

  // Process a job (start downloads)
  const processJob = async (job: DownloadJob) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: "processing" } : j))
    );

    addBreadcrumb("Processing download job", "user", { jobId: job.id });

    const results: DownloadStartResponse[] = [];
    let hasError = false;

    for (const fileId of job.fileIds) {
      try {
        const result = await api.startDownload(fileId);
        results.push(result);

        if (result.status === "failed") {
          hasError = true;
        }
      } catch (err) {
        hasError = true;
        results.push({
          file_id: fileId,
          status: "failed",
          downloadUrl: null,
          size: null,
          processingTimeMs: 0,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    setJobs((prev) =>
      prev.map((j) =>
        j.id === job.id
          ? {
              ...j,
              status: hasError ? "failed" : "completed",
              results,
              completedAt: new Date(),
            }
          : j
      )
    );
  };

  const getStatusIcon = (status: DownloadJob["status"]) => {
    switch (status) {
      case "queued":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DownloadJob["status"]) => {
    const classes: Record<string, string> = {
      queued: "badge-warning",
      processing: "badge-info",
      completed: "badge-success",
      failed: "badge-error",
    };
    return `badge ${classes[status]}`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Download Jobs</span>
        </h2>
      </div>
      <div className="card-body space-y-4">
        {/* New Job Form */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={fileIdsInput}
            onChange={(e) => setFileIdsInput(e.target.value)}
            placeholder="Enter file IDs (comma-separated)"
            className="input flex-1"
          />
          <button
            onClick={initiateJob}
            disabled={isInitiating}
            className="btn btn-primary flex items-center space-x-2"
          >
            {isInitiating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Create Job</span>
          </button>
        </div>

        {/* Jobs List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Download className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No download jobs yet</p>
              <p className="text-sm">Create a job to start downloading files</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Job {job.id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-slate-500">
                        Files: {job.fileIds.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={getStatusBadge(job.status)}>
                      {job.status}
                    </span>
                    {job.status === "queued" && (
                      <button
                        onClick={() => processJob(job)}
                        className="p-1.5 rounded hover:bg-slate-700 text-blue-400"
                        title="Process job"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Results */}
                {job.results && job.results.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="space-y-1">
                      {job.results.map((result) => (
                        <div
                          key={result.file_id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-400">
                            File {result.file_id}
                          </span>
                          <div className="flex items-center space-x-2">
                            {result.status === "completed" ? (
                              <>
                                <span className="text-green-400">
                                  {result.processingTimeMs}ms
                                </span>
                                {result.downloadUrl && (
                                  <a
                                    href={result.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline"
                                  >
                                    Download
                                  </a>
                                )}
                              </>
                            ) : (
                              <span className="text-red-400 flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{result.message}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {job.error && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-400">
                    {job.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
