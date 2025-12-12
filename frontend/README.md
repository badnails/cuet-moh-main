# Frontend - React Observability Dashboard

A React-based observability dashboard for monitoring the File Download Service. Built with React 19, TypeScript, Tailwind CSS, and includes Sentry error tracking and OpenTelemetry distributed tracing.

## Features

- **Health Status**: Real-time monitoring of API and storage health
- **Download Jobs**: Create and track file download jobs
- **Error Log**: View and track errors with Sentry integration
- **Trace Viewer**: View distributed traces with links to Jaeger
- **Performance Metrics**: Real-time response time and throughput visualization

## Tech Stack

- **React 19** - UI framework
- **Vite 6** - Build tool with HMR
- **TypeScript 5.8** - Type safety
- **Tailwind CSS 3.4** - Styling
- **@sentry/react** - Error tracking
- **@opentelemetry/sdk-trace-web** - Distributed tracing
- **Lucide React** - Icons

## Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Sentry DSN
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | - |
| `VITE_SENTRY_URL` | Sentry dashboard URL | `https://sentry.io` |
| `VITE_API_URL` | Backend API URL | `/api` (uses Vite proxy) |
| `VITE_JAEGER_URL` | Jaeger UI URL | `http://localhost:16686` |
| `VITE_OTEL_COLLECTOR_URL` | OTEL collector endpoint | `http://localhost:4318` |
| `VITE_APP_ENV` | App environment | `development` |

## Development with Docker

The frontend is included in the Docker Compose setup:

```bash
# From project root
docker compose -f docker/compose.dev.yml up
```

Access the dashboard at: http://localhost:5173

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── Header.tsx       # Navigation header
│   │   ├── HealthStatus.tsx # Health monitoring widget
│   │   ├── DownloadJobs.tsx # Download job manager
│   │   ├── ErrorLog.tsx     # Error tracking widget
│   │   ├── TraceViewer.tsx  # Trace visualization
│   │   └── PerformanceMetrics.tsx # Metrics display
│   ├── lib/                 # Shared utilities
│   │   ├── api.ts           # API service layer
│   │   ├── sentry.ts        # Sentry configuration
│   │   └── opentelemetry.ts # OTEL configuration
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Tailwind imports & custom styles
├── public/                  # Static assets
├── .env.example             # Environment template
├── Dockerfile               # Container config
├── package.json             # Dependencies
├── tailwind.config.js       # Tailwind config
├── vite.config.ts           # Vite config
└── tsconfig.json            # TypeScript config
```

## API Integration

The frontend communicates with the backend through these endpoints:

- `GET /health` - Health check
- `POST /v1/download/initiate` - Start download job
- `POST /v1/download/check` - Check file availability
- `POST /v1/download/start` - Download file

## Sentry Integration

The dashboard includes:
- Automatic error boundary wrapping
- Manual error capture with business context
- User feedback dialog for errors
- Breadcrumb tracking for debugging

## OpenTelemetry Integration

Distributed tracing includes:
- Automatic fetch instrumentation
- Custom span creation for API calls
- Trace context propagation to backend
- Links to Jaeger UI for detailed traces
