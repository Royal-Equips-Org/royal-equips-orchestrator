# Royal Equips Orchestrator — Enterprise Work Plan (Lock & Execute)

Regel 1: Eerst deze takenlijst exact genereren en pinnen in `docs/workplan.md`.
Regel 2: Werk gefaseerd. Elke taak levert code + tests + docs + CI checks.
Regel 3: Geen placeholders. Fail-fast op missende secrets.

## Phase 0 — Repo hygiene & DX
0.1 Init monorepo structuur (/agents, /services, /packages, /infra, /.github/workflows, /docs).
0.2 Configureer pnpm workspaces, tsconfig basis, eslint+prettier, commitlint, husky.
0.3 CODEOWNERS, Conventional Commits, branch protection spec in docs/security.md.
Deliverables: mapstructuur, tooling, precommit hooks.
Tests: lint+typecheck pipeline groen.

## Phase 1 — Storage & Schema
1.1 Prisma setup met Postgres.
1.2 Modellen: User, Repository, SyncEvent, Conflict, AuditLog, AgentRegistry, Job, Settings.
1.3 Migrations + seed minimale settings.
Deliverables: /packages/storage met Prisma client, migrations.
Tests: prisma validate, CRUD unit tests, migration e2e in Docker.

## Phase 2 — Observability Baseline
2.1 /packages/obs: pino logger, request-ids, OTEL traces, Prometheus metrics.
2.2 HTTP middlewares voor logs/traces/metrics.
Deliverables: logger, tracer, metrics exporters, healthz, readyz.
Tests: contract tests; metrics endpoints assertions.

## Phase 3 — Policy & Security
3.1 /packages/policy: capability model + approval gates.
3.2 AES-GCM encryptor voor tokens (KMS-agnostisch interface).
3.3 Webhook verificatie: Shopify HMAC + GitHub secret.
Deliverables: policy API, guard middleware, crypto util.
Tests: unit tests guards + crypto vectors; negative tests.

## Phase 4 — Shopify & GitHub Clients
4.1 /packages/shopify-client: REST+GraphQL, pagination, limiter, backoff, staging theme ops, webhooks register/verifier.
4.2 /packages/github-client: repo/branch/PR/release, signed commits, diff API, PR update.
Deliverables: typed clients met Zod validators.
Tests: mocked integ tests, rate-limit simulatie.

## Phase 5 — Agent SDK & Bus
5.1 /packages/bus: BullMQ wrapper, namespaces, DLQ, retry+jitter, idempotency.
5.2 /packages/agent-sdk: Agent, AgentManifest, runner, health, context injectie (shopify, github, db, kv, policy, obs).
Deliverables: runner + CLI (royal-agent run <agent>).
Tests: worker concurrency, DLQ path, poison quarantine.

## Phase 6 — Core Services
6.1 /services/gateway: OAuth (Shopify+GitHub), webhook ingress, HMAC verify, token encrypt store, minimal routes.
6.2 /services/orchestrator: planner, dispatcher, supervisor, approvals API.
Deliverables: Fastify apps met OpenAPI.
Tests: OAuth mocked flows, enqueue idempotency, supervisor kill-switch e2e.

## Phase 7 — First Agents (MVP)
7.1 products_sync → DB upsertMany → repo materialization → PR.
7.2 inventory_guard → drift detectie → alerts → badges op staging theme.
7.3 themes_ci → export/import, safe apply, promote on green.
Deliverables: 3 agents + manifests + workers.
Tests: integ + e2e met seeded mocks.

## Phase 8 — Bidirectional Sync
8.1 /packages/sync: 3-way merge, conflicts, rollback, history.
8.2 Shopify→GitHub: webhook → file → commit/PR.
8.3 GitHub→Shopify: diff → staging apply → checks → promote.
Deliverables: pipeline + APIs /sync/:id/*
Tests: merge scenarios, conflict UI fixture, rollback e2e.

## Phase 9 — Console (Ops UI)
9.1 React TS + Tailwind + shadcn/ui.
9.2 Live Feed, Queues, Approvals, Conflicts, Promote, Rate-limits.
9.3 Socket.io, secure cookies, CSRF.
Deliverables: ops console RBAC.
Tests: Playwright e2e.

## Phase 10 — CI/CD
10.1 ci.yml: matrix build, lint, typecheck, unit, integ.
10.2 e2e.yml: docker-compose stack + Playwright.
10.3 deploy.yml: multi-stage Docker builds per package.
Deliverables: 3 workflows + badges.
Tests: pipeline groen; retention; branch protections doc.

## Phase 11 — Docs & Runbooks
11.1 architecture.md: sequences, dataflows, threat model.
11.2 security.md: secrets policy, approvals, incident response.
11.3 runbook.md: local up, first secrets, first sync, rollback.
Deliverables: complete docs.
Tests: md link check; reproduceerbare run.

## Phase 12 — Hardening & SLOs
12.1 p95 latencies en budget in docs/slo.md.
12.2 readiness/liveness; SIGTERM graceful.
12.3 Chaos tests (Redis, 429/5xx, GitHub fail).
Deliverables: resiliency patterns.
Tests: chaos suite groen.

## Vereiste Secrets (fail-fast)
SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_SCOPES,
GITHUB_APP_ID, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET,
DATABASE_URL, REDIS_URL, JWT_SECRET, ENCRYPTION_KEY, APP_URL

## Acceptatiecriteria
- Code + unit/integration/e2e tests
- Strikte types, zod-validated IO
- Logs/metrics/traces aanwezig
- Security-gates op write-capabilities
- Docs bijgewerkt
- CI groen op build_test + e2e

## Uitvoeringsmodus Copilot
- Genereer eerst deze takenlijst
- Open één commit per subtaak
- Na elke fase: CHANGELOG + package bumps
- Geen skeletons; volledige implementatie + tests
- Mens-approval alleen bij write capability gates
