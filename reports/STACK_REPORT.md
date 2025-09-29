# Stack Report — Royal Equips Command Center UI

## Providers & Deployment Targets
- **Cloudflare Pages** – Primary deployment target for the Command Center UI (build via `pnpm run build`, output `dist`). Runtime env vars set through Pages UI (`VITE_API_BASE_URL`).
- **Render (Docker)** – Backend Flask orchestrator deployed separately (`render.yaml`) exposing `/healthz` and downstream APIs consumed by the UI.
- **GitHub Actions** – CI/CD orchestrator with pipelines for build/test (`ci.yml`), Cloudflare deploy (`cloudflare-deploy.yml`), security scans (`security.yml`), and autonomous healing tasks.

## Services & Ports
| Service | Stack | Port | Health | Notes |
|---------|-------|------|--------|-------|
| Command Center UI | React 18 + TypeScript + Vite | `5173` (dev), `3000` (Vite server override) | `/health.json` (static) | Served statically; runtime config via `public/config.json` and env `VITE_API_BASE_URL`.
| Flask Orchestrator | Python 3.11 / Flask (Gunicorn) | `10000` | `/healthz` | Provides `/api/empire/*` endpoints for metrics, agents, opportunities, campaigns, chat, etc.
| Fastify / Ancillary apps | Node 20 | Varies | See respective READMEs | Additional services (AIRA, API, agent executors) within monorepo.

## Configuration & Build System
- **Package Manager**: `pnpm@10.17.0` (workspace defined in `pnpm-workspace.yaml`).
- **Build Scripts**: `pnpm --filter @royal-equips/command-center-ui run build` (TypeScript check + Vite). Lint via ESLint 9.35.0, tests via Vitest (jsdom).
- **Path Aliases**: `@/* → apps/command-center-ui/src/*` (configured in `tsconfig.json` and `vite.config.ts`).
- **Styling**: Tailwind CSS with mobile-first screens (`tailwind.config.js`), shadcn/ui tokens (see `components.json`).

## Environment & Secrets
- **Frontend**: `VITE_API_BASE_URL` (required). Optional fallback `VITE_API_URL` via runtime secrets system. No secrets checked into repo.
- **Runtime Config**: `public/config.json` defines `apiRelativeBase`, feature flags, polling cadence, and circuit-breaker reset endpoint.
- **Backend Secrets** (managed via provider secret stores): Shopify, AutoDS, Spocket, Printful, Klaviyo, Twilio, OpenAI, Supabase, Redis, etc. (See root `README.md`).

## Observability & Resilience
- Structured logging via `src/services/log.ts` with console transport; correlation IDs and circuit breaker built into `api-client.ts`.
- WebSocket heartbeat and health monitoring handled by `realtime-service.ts`.
- CI security scanning through CodeQL and Gitleaks; dependency scans (`pnpm audit`, `osv-scanner`).

## CI/CD Flow
1. **CI Pipeline (`ci.yml`)**: checkout → Node setup → pnpm install → build packages → TypeScript checks → Jest/Vitest suite → upload artifacts.
2. **Security Pipeline (`security.yml`)**: CodeQL init/analyze → pnpm build → Gitleaks → `pnpm audit` + `osv-scanner`.
3. **Deploy (`cloudflare-deploy.yml`)**: Build UI with pnpm, publish to Cloudflare Pages using API token secret.

## Health & Monitoring
- UI static health document (to be served at `/health.json`).
- Backend health endpoints `/healthz` (Flask) and service-specific monitors (`/api/empire/health` when available).
- Runtime store maintains connection status (`useEmpireStore`) with retry/circuit breaker integration.

## Known Gaps / Follow-ups
- Align runtime config (`config.json`) with documented `/api/empire/*` routes to avoid double-prefixing.
- Harden `SecretProvider` encryption (currently base64 placeholder) when backend vault integration is available.
- Implement telemetry export (OpenTelemetry or Sentry) once backend instrumentation endpoints are active.
