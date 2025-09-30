# Royal Equips Command Center Runbook

## Purpose
Operational guide for the Command Center UI (React + Vite) within the Royal Equips empire. Covers local development, testing, deployment, secrets, and rollback procedures.

---
## 1. Local Development
1. Install dependencies (Node 20, pnpm 10.17.0):
   ```bash
   pnpm install
   ```
2. Provide API base URL:
   ```bash
   cd apps/command-center-ui
   cp .env.local.example .env.local # if available
   echo "VITE_API_BASE_URL=http://localhost:10000" >> .env.local
   ```
3. Start backend (Flask or mock) on `http://localhost:10000` exposing `/api/empire/*` routes.
4. Launch the UI:
   ```bash
   pnpm --filter @royal-equips/command-center-ui run dev
   ```
   - Dev server binds to `http://localhost:5173` (proxy to `/api`).
   - Runtime config served from `public/config.json`; adjust `apiRelativeBase` if backend differs.

### Tooling Notes
- Aliases: `@/` → `apps/command-center-ui/src/`.
- Styling: Tailwind (dark-mode by class) + shadcn tokens.
- State: Zustand store at `src/store/empire-store.ts` with optimistic updates and error tracking.

---
## 2. Quality Gates
Run before committing:
```bash
pnpm --filter @royal-equips/command-center-ui run lint
pnpm --filter @royal-equips/command-center-ui exec tsc --noEmit
pnpm --filter @royal-equips/command-center-ui run test
pnpm --filter @royal-equips/command-center-ui run build
```
- Tests: Vitest (jsdom) with setup at `src/test/setup.ts`.
- Coverage thresholds enforced in CI for service/store suites.

---
## 3. Deployment (Cloudflare Pages)
1. Build artifact:
   ```bash
   pnpm --filter @royal-equips/command-center-ui run build
   ```
2. Upload `dist/` to Cloudflare Pages (CI via `.github/workflows/cloudflare-deploy.yml`).
3. Required secrets in Pages:
   - `VITE_API_BASE_URL` → Backend public URL (e.g., `https://api.royalequips.com/api`).
   - Optional: `VITE_API_URL` fallback for legacy clients.
4. Health verification:
   - Confirm `https://<pages-domain>/health.json` returns `status: ok`.
   - Smoke test dashboards and AIRA chat (requires backend `/api/empire/chat`).

---
## 4. Rollback Procedure
1. Trigger Cloudflare Pages rollback to previous successful build via dashboard or API.
2. In CI, re-run the last green deployment workflow with the `GITHUB_SHA` of the known-good commit.
3. Validate:
   - `/health.json` returns `status: ok`.
   - `useEmpireStore` loads metrics/agents without errors (check browser console for `ServiceError`).
4. File incident report including:
   - Impacted modules/components.
   - Root cause and remediation plan.

---
## 5. Secrets & Configuration
- **Frontend**: Only `VITE_` prefixed values allowed. Manage via Cloudflare Pages secrets or GitHub Actions environments.
- **Runtime Config** (`public/config.json`):
  - `apiRelativeBase` → Path prefix appended by `api-client` (default `/api`).
  - `featureFlags` → Toggle UI features (3D scene, polling, circuit breaker, health monitor).
  - `polling` → Metrics/health intervals in milliseconds.
  - `circuitBreaker.resetEndpoint` → Admin endpoint used when resetting via UI controls.
- **No secrets committed**. Local overrides go in `.env.local` (excluded from git).

---
## 6. Monitoring & Alerts
- UI health: `health.json` (static) served alongside assets.
- Backend health: `/healthz` from Flask orchestrator.
- Store exposes `isConnected` + `connectionError`; surface via NetworkStatus bar.
- CI alerts: GitHub Actions status checks (`ci.yml`, `security.yml`, `cloudflare-deploy.yml`). Configure notifications in repository settings.

---
## 7. Incident Response Checklist
1. Confirm alert source (CI, health endpoint, user report).
2. Capture logs: browser console, network traces, GitHub Actions artifacts.
3. If API outage:
   - Inspect circuit breaker status via `apiClient.getCircuitBreakerStatus()` (dev tools console).
   - Consider enabling `isEmergencyMode` in store to freeze automation features.
4. Communicate status in engineering channel; include expected resolution time.
5. After fix, document in `CHANGELOG.md` and attach post-mortem to `docs/runbooks/` if needed.

---
## 8. Contact & Ownership
- **Primary Owner**: Command Center UI squad (Codex automation).
- **Escalation**: Backend orchestrator team (Render service `orchestrator-api`).
- **On-call Artifacts**: Refer to `.github/workflows/autonomous-healing.yml` for auto-remediation steps.
