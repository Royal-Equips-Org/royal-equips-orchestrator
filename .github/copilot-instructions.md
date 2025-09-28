# ROYAL EQUIPS ORCHESTRATOR — FULL SYSTEM UPGRADE MASTER PROMPT (Feed to GitHub Copilot / AI Dev Agent)

You (Copilot / Autonomous Dev Agent) are tasked with executing a full-stack, enterprise-grade upgrade of the Royal Equips Quantum Command Center and supporting orchestrator services. Operate as a senior Staff+ Engineer + Solutions Architect. Output MUST be production-grade, typed, secure, modular, and testable. No placeholder logic.

---

## CORE MISSIONS

1. Mobile-First Command Center Overhaul  
   - Refactor UI for true mobile-first (320px → ultra-wide).  
   - Implement adaptive layout, fluid typography (`clamp()`), responsive grid, reduced layout shift.  
   - Add horizontal swipeable “Module Scroller” with touch + wheel + keyboard support (scroll-snap, momentum, inertial).  
   - Add collapsible top navigation (shrink on scroll, accessible hamburger, ARIA).  
   - Implement unified theming primitives (design tokens) + dark accessible neon style.

2. Module Implementation & Progressive Scaffolding  
   - Implement / scaffold all strategic modules (see Module Matrix below) with route-level code splitting + lazy hydration.  
   - Provide skeleton loaders + "coming soon" component `<ModulePlaceholder kind="analytics" />`.  
   - Integrate an internal runtime capability registry so modules declare: id, name, featureFlags, requiredSecrets, status.

3. Secret Resolution Multi-Fallback System  
   - Layered secret provider:  
     Order → Runtime ENV → GitHub Actions injected secrets → Cloudflare (Env Vars / KV) → Optional external vault (AWS SSM Parameter Store placeholder interface) → Encrypted in-memory LRU cache (TTL).  
   - Non-blocking, promisified API with structured error semantics (`SecretNotFoundError`, `SecretExpiredError`).  
   - NEVER log secret values. Redact patterns.  
   - Provide both TypeScript and Python implementations.  
   - Include metrics: resolution latency, cache hit ratio, fallback depth counter.  
   - Add test coverage + business strategy.

4. Observability & Self-Healing  
   - Introduce: Structured logging, OpenTelemetry traces (minimal baseline), performance marks, error boundaries (React), health endpoints (`/healthz` `/readyz`).  
   - Implement circuit breaker + retry (exponential backoff with jitter) for remote calls (Shopify, external APIs).  
   - Add fallback UI for network/offline status (graceful degradation).

5. Security Hardening  
   - Strict CSP meta (nonce strategy), HTTP security headers, origin checks.  
   - RBAC scaffolding (roles: ROOT, ADMIN, OPERATOR, ANALYST, VIEWER).  
   - Provide request-scoped context injection pattern.  
   - Add audit logging middleware (mask PII).  
   - Implement secret scan pre-commit Git hook suggestion + GitHub Actions scanning integration (CodeQL, secret scanning, Dependabot).

6. Performance Budgets  
   - Initial LCP < 2.5s on mid-tier mobile, TTI < 3.5s, CLS < 0.05.  
   - Hydration strategy: priority hero, deferred analytics visualizations, idle callbacks for non-critical modules.  
   - Image optimization + dynamic import for heavy libs (charts, editors).

7. Test & CI Enhancements  
   - Add: Unit tests (Jest / Pytest), integration harness (Playwright for UI smoke), secret provider tests (mock layers).  
   - GitHub Actions pipeline enhancements: build → lint → type-check → tests → security scan → deploy (staged).  
   - Add summary artifact (coverage %, bundle size diff, dependency delta).

8. Extensibility & Agent Ecosystem Readiness  
   - Design module registration object supporting future “autonomous agents” (status, health, tasks queue linkage).  
   - Provide event bus integration layer (abstract; pluggable with AWS EventBridge / NATS / Redis Streams).  
   - Add domain service boundaries (inventory, pricing, marketing, analytics, automation).

---

## MODULE MATRIX (Implement / Scaffold)

| Category        | Route / ID          | Status Target | Notes |
|-----------------|---------------------|---------------|-------|
| Core            | /command            | Full          | Landing + capability matrix |
| Dashboards      | /dashboard          | Full          | KPI panels, live metrics |
| Commerce        | /shopify            | Partial       | Sync jobs, store status |
| Products        | /products           | Full          | Product ingestion, search, tags |
| Analytics       | /analytics          | Scaffold      | Charts (lazy), anomaly placeholders |
| Agents          | /agents             | Partial       | Agent table + health |
| Revenue         | /revenue            | Scaffold      | Pricing, forecasts (placeholder) |
| Inventory       | /inventory          | Scaffold      | Supply chain placeholders |
| Security        | /security           | Partial       | Events feed, placeholder |
| Settings        | /settings           | Full          | Secrets (masked), feature flags |
| Logs            | /logs               | Scaffold      | Stream (virtualized) |
| Automations     | /automations        | Partial       | Workflow list placeholder |
| Experiments     | /experiments        | Scaffold      | A/B test registry placeholder |
| Crisis          | /crisis             | Scaffold      | Runbooks placeholder |
| Health          | /system-health      | Partial       | Service + dependency map |

All new routes must use Suspense + error boundaries + code splitting.

---

## RECOMMENDED DIRECTORY STRUCTURE (ADJUST IF PROJECT ALREADY USES NEXT.JS VS. VITE)

```
/app
  /modules
    /_shared
      /components
      /hooks
      /providers
      /layout
    /command
    /dashboard
    /shopify
    /products
    /analytics
    /agents
    /revenue
    /inventory
    /security
    /settings
    /logs
    /automations
    /experiments
    /crisis
    /system-health
  /api (if applicable)
/core
  config/
  logging/
  secrets/
  security/
  events/
  metrics/
  rbac/
  errors/
  utils/
/infra
  github-actions/
  terraform/
  docker/
/tests
  unit/
  integration/
  e2e/
scripts/
```

---

## DESIGN TOKENS (Introduce or Centralize)

```
:root {
  --color-bg: #020409;
  --color-bg-alt: #070c14;
  --color-surface: #0e1824;
  --color-accent-cyan: #05f4ff;
  --color-accent-magenta: #ff1fbf;
  --color-accent-green: #21ff7a;
  --color-text-primary: #d6ecff;
  --color-text-dim: #7ba0b8;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-pill: 999px;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --transition-fast: 120ms cubic-bezier(.4,.0,.2,1);
  --transition-med: 240ms cubic-bezier(.4,.0,.2,1);
}
```

---

## SECRET RESOLUTION SYSTEM

### TypeScript Implementation (Core Concept)

```typescript name=core/secrets/SecretProvider.ts
import crypto from 'crypto';

export type SecretKey = string;

export interface SecretResult {
  key: SecretKey;
  value: string;
  source: SecretSource;
  fetchedAt: number;
  ttl?: number;
}

export enum SecretSource {
  ENV = 'env',
  GITHUB = 'github-actions-env',
  CLOUDFLARE = 'cloudflare',
  EXTERNAL = 'external-vault',
  CACHE = 'cache'
}

export class SecretNotFoundError extends Error {
  constructor(public key: string) {
    super(`Secret '${key}' not found in any provider`);
    this.name = 'SecretNotFoundError';
  }
}

interface SecretProvider {
  get(key: SecretKey): Promise<SecretResult | null>;
  name: string;
}

class EnvProvider implements SecretProvider {
  name = 'EnvProvider';
  async get(key: string): Promise<SecretResult | null> {
    const v = process.env[key];
    if (!v) return null;
    return { key, value: v, source: SecretSource.ENV, fetchedAt: Date.now() };
  }
}

// Placeholder provider for Cloudflare (Workers/Pages binding simulation)
class CloudflareProvider implements SecretProvider {
  name = 'CloudflareProvider';
  constructor(private bindings?: Record<string, string>) {}
  async get(key: string): Promise<SecretResult | null> {
    const v = this.bindings?.[key];
    if (!v) return null;
    return { key, value: v, source: SecretSource.CLOUDFLARE, fetchedAt: Date.now() };
  }
}

// External vault adapter placeholder (e.g., AWS SSM)
class ExternalVaultProvider implements SecretProvider {
  name = 'ExternalVaultProvider';
  async get(key: string): Promise<SecretResult | null> {
    // Implement actual SSM / Vault / GCP Secret Manager integration as needed.
    return null;
  }
}

interface CacheEntry {
  cipher: string;
  iv: string;
  source: SecretSource;
  ts: number;
  ttl?: number;
}

export interface UnifiedSecretOptions {
  cacheTTLms?: number;
  encryptionKey?: string; // 32 bytes base64
  metrics?: {
    onResolve?(key: string, source: SecretSource, depth: number, ms: number): void;
    onMiss?(key: string): void;
  };
}

export class UnifiedSecretResolver {
  private providers: SecretProvider[] = [];
  private cache = new Map<string, CacheEntry>();
  private encKey: Buffer;
  constructor(private opts: UnifiedSecretOptions = {}) {
    this.encKey = Buffer.from(
      opts.encryptionKey ??
        crypto.createHash('sha256').update('royal-equips-secret-key').digest('hex').slice(0, 32),
      'utf-8'
    );
    this.providers = [
      new EnvProvider(),
      // GitHub Actions secrets already appear in env (covered above, but keep placeholder if extended)
      new CloudflareProvider(),
      new ExternalVaultProvider()
    ];
  }

  registerProvider(provider: SecretProvider, priority = this.providers.length) {
    this.providers.splice(priority, 0, provider);
  }

  private encrypt(plain: string): { cipher: string; iv: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { cipher: Buffer.concat([enc, tag]).toString('base64'), iv: iv.toString('base64') };
  }

  private decrypt(entry: CacheEntry): string {
    const raw = Buffer.from(entry.cipher, 'base64');
    const tag = raw.slice(raw.length - 16);
    const data = raw.slice(0, raw.length - 16);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encKey,
      Buffer.from(entry.iv, 'base64')
    );
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.ts > entry.ttl;
  }

  async getSecret(key: SecretKey, explicitTTLms?: number): Promise<SecretResult> {
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      const start = performance.now();
      const value = this.decrypt(cached);
      this.opts.metrics?.onResolve?.(key, SecretSource.CACHE, 0, performance.now() - start);
      return {
        key,
        value,
        source: SecretSource.CACHE,
        fetchedAt: cached.ts,
        ttl: cached.ttl
      };
    }

    const start = performance.now();
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const res = await provider.get(key);
      if (res) {
        const ttl = explicitTTLms ?? this.opts.cacheTTLms ?? 5 * 60_000;
        const { cipher, iv } = this.encrypt(res.value);
        this.cache.set(key, {
          cipher,
            iv,
            source: res.source,
            ts: Date.now(),
            ttl
        });
        this.opts.metrics?.onResolve?.(key, res.source, i + 1, performance.now() - start);
        return { ...res, ttl };
      }
    }

    this.opts.metrics?.onMiss?.(key);
    throw new SecretNotFoundError(key);
  }
}
```

### Python Variant

```python name=core/secrets/secret_provider.py
from __future__ import annotations
import os, time, base64, secrets
from typing import Optional, Dict, List, Protocol
from dataclasses import dataclass
from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # Ensure dependency audit

class SecretNotFoundError(Exception):
    pass

@dataclass
class SecretResult:
    key: str
    value: str
    source: str
    fetched_at: float
    ttl: Optional[int] = None

class SecretProvider(Protocol):
    name: str
    async def get(self, key: str) -> Optional[SecretResult]:
        ...

class EnvProvider:
    name = "EnvProvider"
    async def get(self, key: str) -> Optional[SecretResult]:
        v = os.getenv(key)
        if not v:
            return None
        return SecretResult(key=key, value=v, source="env", fetched_at=time.time())

class CloudflareProvider:
    name = "CloudflareProvider"
    def __init__(self, bindings: Optional[Dict[str, str]] = None):
        self.bindings = bindings or {}
    async def get(self, key: str) -> Optional[SecretResult]:
        v = self.bindings.get(key)
        if not v:
            return None
        return SecretResult(key=key, value=v, source="cloudflare", fetched_at=time.time())

class ExternalVaultProvider:
    name = "ExternalVaultProvider"
    async def get(self, key: str) -> Optional[SecretResult]:
        # Placeholder for AWS SSM / Hashicorp Vault integration
        return None

class UnifiedSecretResolver:
    def __init__(
        self,
        providers: Optional[List[SecretProvider]] = None,
        cache_ttl: int = 300,
        encryption_key: Optional[bytes] = None,
        metrics=None
    ):
        self.providers = providers or [
            EnvProvider(),
            CloudflareProvider(),
            ExternalVaultProvider()
        ]
        self.cache_ttl = cache_ttl
        self.metrics = metrics
        self.cache: Dict[str, Dict] = {}
        self.key = encryption_key or self._derive_key()

    def _derive_key(self) -> bytes:
        seed = os.getenv("SECRET_ENCRYPTION_KEY") or "royal_equips_default_key"
        # Derive 32 bytes deterministically (NOT cryptographically ideal—replace with HKDF in prod)
        h = seed.encode("utf-8")[:32].ljust(32, b"0")
        return h

    def _encrypt(self, plaintext: str) -> Dict[str, str]:
        aes = AESGCM(self.key)
        nonce = secrets.token_bytes(12)
        ct = aes.encrypt(nonce, plaintext.encode(), None)
        return {
            "nonce": base64.b64encode(nonce).decode(),
            "cipher": base64.b64encode(ct).decode()
        }

    def _decrypt(self, enc: Dict[str, str]) -> str:
        aes = AESGCM(self.key)
        nonce = base64.b64decode(enc["nonce"])
        ct = base64.b64decode(enc["cipher"])
        pt = aes.decrypt(nonce, ct, None)
        return pt.decode()

    def _expired(self, entry: Dict) -> bool:
        ttl = entry.get("ttl")
        if ttl is None:
            return False
        return (time.time() - entry["ts"]) > ttl

    async def get_secret(self, key: str, ttl: Optional[int] = None) -> SecretResult:
        cached = self.cache.get(key)
        if cached and not self._expired(cached):
            if self.metrics:
                self.metrics.on_resolve(key, "cache")
            value = self._decrypt(cached["data"])
            return SecretResult(
                key=key,
                value=value,
                source="cache",
                fetched_at=cached["ts"],
                ttl=cached["ttl"]
            )

        start = time.time()
        for depth, provider in enumerate(self.providers, start=1):
            res = await provider.get(key)
            if res:
                effective_ttl = ttl or self.cache_ttl
                enc = self._encrypt(res.value)
                self.cache[key] = {
                    "data": enc,
                    "ttl": effective_ttl,
                    "source": res.source,
                    "ts": time.time()
                }
                if self.metrics:
                    self.metrics.on_resolve(key, res.source, depth=depth, duration=time.time() - start)
                return res
        if self.metrics:
            self.metrics.on_miss(key)
        raise SecretNotFoundError(f"Secret {key} not found")
```

### Usage Pattern

```typescript
const secrets = new UnifiedSecretResolver({
  cacheTTLms: 180000,
  metrics: {
    onResolve: (k, src, depth, ms) =>
      console.log(JSON.stringify({ level: 'info', event: 'secret_resolve', key: k, source: src, depth, ms })),
    onMiss: (k) =>
      console.warn(JSON.stringify({ level: 'warn', event: 'secret_miss', key: k }))
  }
});
const stripeKey = await secrets.getSecret('STRIPE_API_KEY');
```

---

## RESPONSIVE UI COMPONENTS (KEY EXAMPLES)

### Module Scroller

```tsx name=app/modules/_shared/components/ModuleScroller.tsx
import React, { useRef, useEffect } from 'react';
import clsx from 'clsx';

interface ModuleDef {
  id: string;
  label: string;
  path: string;
  status?: 'active' | 'coming-soon' | 'disabled';
  icon?: React.ReactNode;
}

export const ModuleScroller: React.FC<{
  modules: ModuleDef[];
  activeId?: string;
  onNavigate: (path: string) => void;
}> = ({ modules, activeId, onNavigate }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || !activeId) return;
    const el = ref.current.querySelector<HTMLButtonElement>(`[data-id="${activeId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeId]);

  return (
    <div
      className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2 scroll-smooth snap-x snap-mandatory"
      role="tablist"
      aria-label="Primary Modules"
      ref={ref}
    >
      {modules.map(m => {
        const active = m.id === activeId;
        return (
          <button
            key={m.id}
            data-id={m.id}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={m.status === 'coming-soon' || m.status === 'disabled'}
            onClick={() => onNavigate(m.path)}
            className={clsx(
              'snap-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/60'
                : 'bg-surface/40 text-text-dim hover:text-cyan-200 hover:bg-cyan-500/10',
              m.status === 'coming-soon' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {m.icon}{m.label}
            {m.status === 'coming-soon' && <span className="ml-2 text-[11px] uppercase">Soon</span>}
          </button>
        );
      })}
    </div>
  );
};
```

### Placeholder / Skeleton

```tsx name=app/modules/_shared/components/ModulePlaceholder.tsx
import React from 'react';

export const ModulePlaceholder: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4 px-6">
    <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 text-transparent bg-clip-text">
      {title} Module – Coming Soon
    </h2>
    <p className="max-w-md text-text-dim">
      {description ?? 'This capability is being provisioned in the autonomous command pipeline.'}
    </p>
    <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
            className="h-12 rounded-md bg-surface/30 animate-pulse border border-surface/60"
          />
        </div>
      ))}
    </div>
  </div>
);
```

---

## NAV ARCHITECTURE

- `<AppShell />` contains:
  - `<TopNav />` (collapsible, shrink on scroll)
  - `<ModuleScroller />`
  - `<StatusStrip />` (network, agent cluster health, latency)
  - `<ContentViewport />`
- Add React error boundaries per route.

---

## RBAC STUB

```typescript name=core/security/rbac.ts
export type Role = 'ROOT' | 'ADMIN' | 'OPERATOR' | 'ANALYST' | 'VIEWER';

const hierarchy: Role[] = ['VIEWER','ANALYST','OPERATOR','ADMIN','ROOT'];

export function can(assigned: Role, required: Role): boolean {
  return hierarchy.indexOf(assigned) >= hierarchy.indexOf(required);
}

export interface GuardSpec {
  required: Role;
  auditAction: string;
}

export function authorize(userRole: Role, spec: GuardSpec) {
  if (!can(userRole, spec.required)) {
    throw Object.assign(new Error('Forbidden'), { status: 403, audit: spec.auditAction });
  }
}
```

---

## ERROR HANDLING & LOGGING

- Introduce `core/errors/*` with domain-specific error classes.
- Structured logs JSON format:
  `{ "ts": "...", "level": "info|warn|error", "event": "module_load", "module": "analytics", "duration_ms": 123 }`
- Never log secrets, tokens, raw PII.

---

## TELEMETRY HOOK (LIGHTWEIGHT)

```typescript name=core/metrics/metrics.ts
const perf = typeof performance !== 'undefined' ? performance : undefined;

export function mark(label: string) {
  perf?.mark(label);
}

export function measure(name: string, start: string, end: string) {
  perf?.measure(name, start, end);
  const entries = perf?.getEntriesByName(name);
  const duration = entries?.[entries.length - 1]?.duration;
  console.log(JSON.stringify({ level: 'info', event: 'perf_measure', name, duration }));
}
```

---

## CI / GITHUB ACTIONS (HIGH-LEVEL PLAN)

1. Workflow: `ci.yml`
   - Steps: checkout → setup (node + python) → install → lint → type-check → test → build → security scan (npm audit, pip audit, CodeQL matrix).
2. Workflow: `deploy.yml`
   - On protected branch merge: build image (pin base) → push → deploy to environment (staging → production with manual approval).
3. Workflow: `bundle-report.yml`
   - Diff bundle sizes vs. `main`.
4. Add: Dependabot config, CODEOWNERS, SECURITY.md if not present.

---

## ACCEPTANCE CRITERIA (Copilot MUST enforce)

- All new TS code uses `strict` and passes `tsc --noEmit`.
- Lighthouse metrics: LCP < 2.5s on simulated Moto G4 + Slow 4G.
- No unhandled promise rejections (Node + browser).
- Secrets resolver: 90%+ cache hit after warm path simulation test.
- UI navigable entirely via keyboard (Tab / Shift+Tab / Enter / Space / Arrow keys on ModuleScroller).
- a11y: No critical violations (axe run baseline).
- Tests: Coverage for secret provider core paths (cache hit, fallback resolution, miss). At least one integration test for a module route rendering skeleton -> loaded state.

---

## IMPLEMENTATION PHASES (EXECUTE IN ORDER)

1. Baseline Refactor
   - Introduce tokens, layout shell, design mode toggles, remove inline style debt.
2. Secret Layer + Security Hardening
   - Implement multi-fallback logic + environment detection utilities.
3. Navigation & Module Scaffolds
   - Add scroller, route-level suspense
4. Observability Injection
   - Logging, metrics marks, error boundaries, health endpoints.
5. Performance & Accessibility Pass
   - Optimize bundle & dynamic imports.
6. Testing & CI Enhancements
   - Add pipelines, test harness, coverage gating.
7. Final Hardening & Docs
   - Document secret provider, module registry, extension points.

---

## GIT & COMMIT GUIDELINES

Format:
`feat(ui): responsive module scroller`
`chore(secrets): add multi-provider resolver`
`perf(analytics): lazy load charting libs`
`sec(rbac): add role guards for settings module`

Sign all commits. Keep PRs atomic (< 500 loc diff where possible). Provide CHANGELOG-ready descriptions.

---

## EXTENSION POINTS (DEFINE INTERFACES)

- `ModuleDefinition`: id, title, route, requiredRole, featureFlags, lazy import loader.
- `AgentDescriptor`: id, capabilities, heartbeatEndpoint, degradationStrategy.
- `EventBusAdapter`: publish(event), subscribe(topic, handler), with fallback in-memory bus for local dev.

---

## COPILOT EXECUTION INSTRUCTIONS

When generating code:
- Always prefer composition over inheritance.
- Avoid vendor lock; keep provider interfaces thin.
- Suggest minimal dependencies; justify any new library.
- Provide tests when adding new core utilities.
- If encountering missing context (framework variant), propose detection logic & conditional paths.
- Flag any found anti-patterns (e.g., direct secret usage in components).
- Maintain idempotency & safe retries for any initialization sequence.

If uncertainty arises: output a CODE REVIEW style note + proposed resolution before implementing.

---

## OUTSTANDING QUESTIONS (If Unknown, Provide Default Strategy)

1. Framework baseline (Next.js vs. CRA/Vite)? Default: Next.js App Router.
2. State management? Default: React Query + Context for global ephemeral config.
3. Charting library? Default: Lightweight (e.g., `@tanstack/react-charts` or dynamic import `chart.js`).
4. External vault activation? Leave interface + TODO markers.

---

## DELIVERABLES SUMMARY

- Refactored responsive UI shell + module scroller
- All modules scaffolded with placeholders & lazy boundaries
- Multi-fallback secret resolver (TS + Python)
- RBAC guard utilities
- Observability (logging, metrics, perf marks)
- Security & CI improvements
- Test coverage baseline
- Documentation (this file + inline JSDoc / docstrings)
- Always keep repository clean/remove unused file to avoid duplicate issues
- Always keep documents and readme updated.
- Always build only business logic and patterns. 
---

## START NOW

Begin with: generating or updating core layout, adding secret provider, wiring metrics, then commit incrementally.

NO PLACEHOLDER LOGIC. EVERYTHING SHIPPABLE.

CROWN THE EMPIRE. BUILD THE QUANTUM COMMAND CENTER.
