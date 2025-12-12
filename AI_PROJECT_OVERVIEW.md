# AI Project Overview

This document is for tooling / AI agents interacting with this repo. It summarizes the structure, main entrypoints, and how to run / test the service.

## 1. High-level Summary

- **Service type**: HTTP API simulating long-running file downloads backed by S3-compatible storage.
- **Language**: TypeScript (run directly by Node 24 using `--experimental-transform-types`).
- **Framework**: [Hono](https://hono.dev/) with OpenAPI + Zod.
- **Storage**: AWS S3-compatible (real S3 or self-hosted like MinIO/RustFS); can run in a fully mocked mode.
- **Observability**: OpenTelemetry (OTLP exporter) + Sentry + security/rate-limit middleware.
- **Tests**: E2E tests that start the server and hit real HTTP endpoints.
- **Docker**: Dev + prod Dockerfiles and docker-compose for local orchestration.
- **CI**: GitHub Actions workflow `ci.yml` (lint → format → e2e tests → Docker build).

## 2. Repository Layout

Root files:

- `src/index.ts` — **main application entrypoint**. Creates Hono app, configures middlewares, defines routes, and starts the HTTP server.
- `package.json` — Node package metadata and scripts.
- `tsconfig.json` — TypeScript compiler settings (used mainly for tooling / typechecking; runtime uses Node transforms).
- `eslint.config.mjs` — ESLint configuration.
- `README.md` — Human-facing project overview and challenge description.
- `.env.example` — Example environment configuration for local/dev use.
- `.dockerignore` — Files excluded from Docker build context.
- `docker/` — Dockerfiles and docker-compose manifests (dev + prod).
- `scripts/` — E2E runner and tests executed via Node.
- `.github/workflows/ci.yml` — GitHub Actions CI configuration.

## 3. Application Entry & Core Modules

### 3.1 `src/index.ts`

Primary responsibilities:

- **Environment parsing** via Zod:
  - Schema `EnvSchema` defines and validates variables like `NODE_ENV`, `PORT`, `S3_REGION`, `S3_BUCKET_NAME`, `REQUEST_TIMEOUT_MS`, `RATE_LIMIT_*`, `CORS_ORIGINS`, and download delay knobs (`DOWNLOAD_DELAY_*`).
  - Helper `optionalUrl` treats empty strings as `undefined` for URL-like env vars.

- **S3 client configuration**:
  - Constructs an `S3Client` using env:
    - `S3_REGION` (required, default `us-east-1`).
    - Optional `S3_ENDPOINT` (for MinIO/RustFS).
    - Optional explicit `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`.
    - `S3_FORCE_PATH_STYLE` for path-style addressing.

- **Health checks**:
  - `checkS3Health`:
    - If `S3_BUCKET_NAME === ""` → **mock mode**, considered healthy.
    - Else performs `HeadObject` on key `__health_check_marker__`.
      - `NotFound` → still healthy (bucket reachable).
      - Any other error → storage unhealthy.

- **Availability checks**:
  - `sanitizeS3Key(fileId)` → safe S3 key: `downloads/{fileId}.zip`.
  - `checkS3Availability`:
    - If `S3_BUCKET_NAME === ""` → mock availability: `available` when `fileId % 7 === 0`.
    - Else HEADs the concrete object and returns `{ available, s3Key, size }`.

- **Download simulation**:
  - `getRandomDelay` uses `DOWNLOAD_DELAY_MIN_MS` / `DOWNLOAD_DELAY_MAX_MS`.
  - `/v1/download/start` (POST) simulates a long-running job by waiting a random delay, then checking S3 availability and returning either a success payload (with mocked download URL) or failure.

- **HTTP routes** (Hono):
  - `GET /` — basic root endpoint (`{"message":"Hello Hono!"}`).
  - `GET /health` — returns health + storage status; HTTP 200 vs 503 based on storage.
  - `POST /v1/download/initiate` — accepts `file_ids[]` (validated bounds) and returns a `jobId` (UUID) and `status: "queued"` (currently no persistent job tracking).
  - `POST /v1/download/check` — accepts a single `file_id`, validates it, and returns availability info from `checkS3Availability`. Can intentionally trigger a Sentry error with query `sentry_test=true`.
  - `POST /v1/download/start` — long-running synchronous simulation endpoint.
  - Non-production-only endpoints:
    - `GET /openapi` — returns OpenAPI spec.
    - `GET /docs` — interactive docs UI.

- **Cross-cutting middleware**:
  - Request ID middleware — assigns a UUID and exposes it via the `x-request-id` header and context.
  - Security headers — via `hono/secure-headers`.
  - CORS — configured via `CORS_ORIGINS` env (comma-separated or `*`).
  - Timeout — via `hono/timeout`, governed by `REQUEST_TIMEOUT_MS`.
  - Rate limiting — via `hono-rate-limiter`, using `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.
  - OpenTelemetry — `NodeSDK` + `OTLPTraceExporter`, plus HTTP instrumentation middleware.
  - Sentry — Hono Sentry middleware using `SENTRY_DSN`.
  - Global `app.onError` handler — captures exceptions with Sentry, returns structured JSON errors including `requestId`.

- **Lifecycle**:
  - Server started with `serve({ fetch: app.fetch, port: env.PORT })`.
  - Graceful shutdown handler closes the HTTP server, shuts down OTEL SDK, and destroys the S3 client.

## 4. Scripts & Testing

### 4.1 E2E Runner: `scripts/run-e2e.ts`

- Manages server lifecycle for tests:
  - Computes project root.
  - Optionally passes `--env-file=.env` to Node if not in CI and `.env` exists.
  - Spawns: `node [--env-file=.env] --experimental-transform-types src/index.ts`.
  - Waits until `/health` returns a response or times out.
  - Then runs `node --experimental-transform-types scripts/e2e-test.ts`.
  - Ensures server process is terminated on completion or signals (SIGINT/SIGTERM).

### 4.2 E2E Tests: `scripts/e2e-test.ts`

- Hit a real HTTP server at `BASE_URL` (default `http://localhost:3000`).
- Coverage:
  - Root endpoint response.
  - `/health` content and HTTP code vs `status` field and `checks.storage`.
  - Security headers: request ID, rate limit headers, secure defaults.
  - `/v1/download/initiate`: valid/invalid payloads, validation errors.
  - `/v1/download/check`: availability behavior & validation of `file_id` bounds.
  - `/v1/download/start`: long-running behavior and responses (indirect in some tests).
  - Request ID propagation and error handling for wrong content types.
  - Method not allowed / 404 behavior.
  - Rate limiting behavior and headers.

### 4.3 npm Scripts (from `package.json`)

Typical relevant scripts (names may slightly vary; confirm in `package.json`):

- `npm run dev` — dev server (often via something like `nodemon` or similar) using `src/index.ts`.
- `npm run lint` — ESLint.
- `npm run format:check` — formatting check (likely Prettier).
- `npm run test:e2e` — runs `scripts/run-e2e.ts`.

## 5. Docker & Compose

### 5.1 Dev: `docker/Dockerfile.dev` + `docker/compose.dev.yml`

- `Dockerfile.dev`:
  - Base: `node:24-alpine`.
  - `WORKDIR /app`.
  - Copies `package*.json` and runs `npm install`.
  - Copies rest of the repo (`COPY . .`).
  - Exposes port `3000`.
  - `CMD ["npm", "run", "dev"]`.

- `docker/compose.dev.yml`:
  - Service `delineate-app`:
    - Build from `docker/Dockerfile.dev` with context `..`.
    - Ports: `3000:3000`.
    - Mounts `../src:/app/src` for live-reload development.
    - Uses `.env` at project root by default and overrides some env vars:
      - `NODE_ENV=development`.
      - `OTEL_EXPORTER_OTLP_ENDPOINT=http://delineate-jaeger:4318`.
    - Depends on `delineate-jaeger`.
  - Service `delineate-jaeger`:
    - Image: `jaegertracing/all-in-one:latest`.
    - Ports: `16686` (UI), `4318` (OTLP HTTP collector).
    - `COLLECTOR_OTLP_ENABLED=true`.

### 5.2 Prod: `docker/Dockerfile.prod` + `docker/compose.prod.yml`

- `Dockerfile.prod`:
  - **Builder** stage:
    - Base: `node:24-alpine`.
    - `WORKDIR /app`.
    - Copies `package*.json` and runs `npm ci --only=production`.
  - **Runtime** stage:
    - Base: `node:24-alpine`.
    - Installs `tini` for signal handling.
    - Copies `node_modules` from builder and `package*.json`, `src`.
    - Switches to non-root user `node`.
    - Exposes port `3000`.
    - `ENTRYPOINT ["/sbin/tini", "--"]`.
    - `CMD ["node", "--experimental-transform-types", "src/index.ts"]`.
    - `HEALTHCHECK` querying `http://localhost:3000/health`.

- `docker/compose.prod.yml`:
  - Service `delineate-app`:
    - Builds from `docker/Dockerfile.prod`.
    - Ports: `3000:3000`.
    - Loads env from `../.env`.
    - `NODE_ENV=production`.
    - `restart: unless-stopped`.

## 6. CI (GitHub Actions)

- Workflow file: `.github/workflows/ci.yml`.
- Triggers:
  - `push` and `pull_request` on branches `main` and `master`.
- Jobs:
  1. **lint**
     - Runs Node 24 in a container.
     - `npm ci`, then `npm run lint` and `npm run format:check`.
  2. **test** (E2E)
     - Depends on `lint`.
     - `npm ci`, then `npm run test:e2e`.
     - Uses env that puts S3 in **mock mode**:
       - `S3_BUCKET_NAME=""` and `S3_FORCE_PATH_STYLE="true"`, etc.
  3. **build**
     - Depends on `test`.
     - Builds Docker image from `docker/Dockerfile.prod` via `docker/build-push-action` (no push by default, but with cache enabled).

## 7. Environment & Configuration

Key env vars (validated via `EnvSchema` in `src/index.ts`):

- **Core**:
  - `NODE_ENV` — `development` | `production` | `test` (default: `development`).
  - `PORT` — server port (default: `3000`).

- **S3 / Storage**:
  - `S3_REGION` — default `us-east-1`.
  - `S3_ENDPOINT` — e.g. `http://localhost:9000` or internal MinIO/RustFS URL.
  - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — only required when using authenticated S3.
  - `S3_BUCKET_NAME` — bucket name; if empty, *mock mode* is enabled.
  - `S3_FORCE_PATH_STYLE` — bool (important for MinIO/RustFS).

- **Observability**:
  - `SENTRY_DSN` — optional DSN for Sentry.
  - `OTEL_EXPORTER_OTLP_ENDPOINT` — OTLP HTTP collector URL (e.g. Jaeger).

- **Timeouts & Rate Limiting**:
  - `REQUEST_TIMEOUT_MS` — per-request timeout, min 1000 (default 30000).
  - `RATE_LIMIT_WINDOW_MS` — sliding window length (default 60000).
  - `RATE_LIMIT_MAX_REQUESTS` — requests per window (default 100).

- **CORS & Download Delay**:
  - `CORS_ORIGINS` — `*` or comma-separated origins.
  - `DOWNLOAD_DELAY_ENABLED` — bool to enable/disable simulated delay.
  - `DOWNLOAD_DELAY_MIN_MS` / `DOWNLOAD_DELAY_MAX_MS` — controls range of simulated processing time.

See `.env.example` for a canonical example.

## 8. Notes for Future AI Agents

- **Use existing scripts**:
  - For integration/E2E testing, prefer running `npm run test:e2e` or invoking `scripts/run-e2e.ts` instead of starting the server manually.
  - For dev, rely on `npm run dev` and `docker/compose.dev.yml` if containers are required.

- **Respect runtime style**:
  - The project intentionally uses `node --experimental-transform-types` to run TypeScript directly *without* a separate build step. Don’t assume a `dist/` directory or compiled JS unless you add one explicitly.

- **S3 behavior**:
  - Be aware of **mock mode** when `S3_BUCKET_NAME` is empty; availability and health checks are simulated. For tests and CI this is the default.
  - When adding features that interact with S3, reuse the existing `s3Client`, `sanitizeS3Key`, `checkS3Health`, and `checkS3Availability` helpers.

- **Long-running jobs**:
  - `/v1/download/start` is currently synchronous and primarily a simulation. Any future refactor to job queues / polling / websockets should preserve the public contract used by the E2E tests or adjust tests accordingly.

- **Middleware & cross-cutting concerns**:
  - New routes should generally:
    - Respect existing middleware (request IDs, OTEL, Sentry, rate limit, timeout).
    - Return consistent JSON error shapes so the global `onError` behavior works correctly.

- **CI & Docker expectations**:
  - Changes that break `npm run lint`, `npm run format:check`, `npm run test:e2e`, or the Docker build will fail CI.
  - If adding new environment variables required for runtime, update `EnvSchema` in `src/index.ts`, `.env.example`, and any GitHub Actions env blocks.

This overview should give automated tools enough structure to navigate the codebase, understand key entrypoints, and modify or extend the service safely.