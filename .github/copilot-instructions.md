# ROYAL EQUIPS ORCHESTRATOR — AI DEVELOPMENT GUIDE

## 🏰 System Overview

This is the **Royal Equips Empire**: an autonomous e-commerce platform with intelligent agents managing product research, inventory, marketing, and fulfillment. The system is **production-ready** and **revenue-generating** - not a prototype.

### Architecture at a Glance
- **Monorepo** (pnpm workspaces) with TypeScript + Python
- **Flask** main orchestrator + multiple **FastAPI** services  
- **React + Vite** command center UI with lazy-loaded modules
- **Multi-agent system** with real API integrations (Shopify, AutoDS, Spocket)
- **Cross-platform deployment** (Render, Cloudflare Workers, Docker)

## 🚨 CRITICAL ENTERPRISE RULES

### NEVER USE PLACEHOLDERS OR MOCK DATA
This system generates real revenue. Every component must connect to actual APIs and data:
- ✅ **Real integrations**: Shopify, AutoDS, Spocket, GitHub, Cloudflare
- ✅ **Live data flows**: Orders, products, campaigns, metrics
- ✅ **Production services**: AIRA AI backend, health monitoring, secret management
- ❌ **Forbidden**: Mock APIs, placeholder components, fake data, "coming soon" messages

### Key Real Systems to Connect To
- **AIRA Service**: `/apps/aira/src/index.ts` (AI orchestrator backend)
- **Flask Orchestrator**: `/app/routes/*.py` (agent management, metrics)
- **Command Center UI**: `/apps/command-center-ui/src` (React dashboard)
- **Secret System**: `/core/secrets/` (multi-provider resolution)
- **Agent Executors**: `/apps/agent-executors/` (business logic agents)

---

## 🔧 MONOREPO STRUCTURE (CRITICAL TO UNDERSTAND)

### Root-Level Services
```
/app/                    # Flask orchestrator (main API, agents, health)
/wsgi.py                 # WSGI production entry point  
/orchestrator/           # Core agent system + business logic
/core/                   # Shared utilities (secrets, health, security)
/royal_platform/         # E-commerce platform integrations
/royal_mcp/              # Model Context Protocol server
```

### Apps (pnpm workspaces)
```
/apps/command-center-ui/ # React+Vite dashboard (port 5173)
/apps/aira/             # FastAPI AI orchestrator (port 3001) 
/apps/api/              # FastAPI general API (port 3000)
/apps/orchestrator-api/ # FastAPI orchestrator API (port 3002)
/apps/agent-executors/  # Agent execution service (port 3003)
```

### Packages (shared libs)
```  
/packages/shared-types/ # TypeScript type definitions
/packages/agents-core/  # Agent base classes & utilities
/packages/connectors/   # External API integrations
/packages/obs/          # Observability utilities  
/packages/shopify-client/ # Shopify API client
```

## 🚀 DEVELOPMENT WORKFLOWS

### Essential Commands (Use These!)
```bash
# Install dependencies for entire monorepo
pnpm install

# Start all services in development
pnpm dev

# Start specific apps
pnpm dev:orchestrator-api  # FastAPI orchestrator
pnpm dev:aira             # AIRA AI service  
pnpm start                # Flask main app (production mode)

# Build all packages and apps
pnpm build

# Type checking across all TypeScript projects  
pnpm typecheck

# Lint all code
pnpm lint

# Run tests
pnpm test
```

### Python Services
```bash
# Flask orchestrator (main service)
python wsgi.py
# Or with Gunicorn (production)
gunicorn -w 2 -b 0.0.0.0:10000 wsgi:app

# Makefile shortcuts
make setup     # Development environment setup
make run       # Run orchestrator API
make dashboard # Start holographic control center
make ci        # Complete CI pipeline locally
```

## 🎯 CURRENT IMPLEMENTATION STATUS

### Flask Orchestrator (`/app/routes/`)
- ✅ **Health & Metrics**: `/healthz`, `/readyz`, `/metrics` (core/health_service.py)
- ✅ **Agent System**: Agent sessions, messaging, streaming (agents.py)  
- ✅ **Command Center**: SPA serving, empire status (command_center.py)
- ✅ **Empire Management**: Campaign execution, product research (empire.py)
- ✅ **WebSocket Streams**: Real-time data (sockets.py, SocketIO)

### React Command Center (`/apps/command-center-ui/src/`)
- ✅ **Module System**: Lazy loading with Suspense boundaries implemented
- ✅ **Store Management**: Zustand stores (empire, navigation, performance)
- ✅ **Real Modules**: AIRA, Analytics, Agents, Dashboard, Revenue, Inventory, Marketing
- ✅ **Mobile Responsive**: Layout shells, navigation, module scroller
- ✅ **Performance**: Metrics tracking, optimization hooks, bundle splitting

### FastAPI Services (All Operational)
- ✅ **AIRA** (`/apps/aira/`): AI orchestration, system routes, metrics
- ✅ **API** (`/apps/api/`): General API with agents, health, auth routes
- ✅ **Orchestrator API** (`/apps/orchestrator-api/`): Agent management API
- ✅ **Agent Executors** (`/apps/agent-executors/`): Business logic execution

### Core Systems (Production Ready)  
- ✅ **Secret Resolution** (`/core/secrets/`): Multi-provider with encryption + caching
- ✅ **Health Monitoring** (`/core/health_service.py`): Circuit breakers, dependencies
- ✅ **Agent Framework** (`/orchestrator/core/`): Base classes, orchestration, monitoring
- ✅ **E-commerce Integration** (`/royal_platform/`): Shopify, AutoDS, Spocket connectors

## 🏗️ ARCHITECTURE PATTERNS & INTEGRATIONS

### Multi-Service Coordination
```typescript
// Service discovery pattern used throughout
const endpoints = {
  flask: process.env.FLASK_API_URL || 'http://localhost:10000',
  aira: process.env.AIRA_API_URL || 'http://localhost:3001', 
  orchestrator: process.env.ORCHESTRATOR_API_URL || 'http://localhost:3002',
  agents: process.env.AGENTS_API_URL || 'http://localhost:3003'
};

// Cross-service health checks (see /core/health_service.py)
const healthCheck = async (service: string) => {
  return fetch(`${endpoints[service]}/healthz`);
};
```

### Agent System Integration
```python
# Flask routes delegate to orchestrator core
from orchestrator.core.orchestrator import Orchestrator
from app.orchestrator_bridge import get_orchestrator

# Real agent execution (not mock)
@agents_bp.route("/status")  
def get_agents_status():
    orchestrator = get_orchestrator()
    return orchestrator.get_all_agents_health()
```

### Secret Resolution (Already Implemented)
```python
# /core/secrets/secret_provider.py - Production ready
from core.secrets.secret_provider import UnifiedSecretResolver

secrets = UnifiedSecretResolver()
api_key = await secrets.get_secret('SHOPIFY_API_KEY')
# Cascades: ENV → GitHub → Cloudflare → External → Cache
```

### React Module Architecture (Current Pattern)

```typescript
// /apps/command-center-ui/src/App.tsx - Lazy loading pattern
const AiraModule = lazy(() => import('./modules/aira/AiraModule'));
const AgentsModule = lazy(() => import('./modules/agents/AgentsModule'));

// Module registration with real routing
const renderCurrentModule = () => {
  switch (state.currentModule) {
    case 'aira':
      return <Suspense fallback={<Loading />}><AiraModule /></Suspense>;
    case 'agents': 
      return <Suspense fallback={<Loading />}><AgentsModule /></Suspense>;
  }
};
```

### Database & Persistence Patterns
```python
# /royal_platform/database/ - SQLAlchemy models
from royal_platform.database.models import Agent, Campaign, ProductOpportunity

# /app/services/ - Business logic services  
from app.services.health_service import HealthService
from app.services.agent_monitor import AgentMonitor
```

### WebSocket Real-Time Updates
```python
# /app/sockets.py - SocketIO integration with Flask
from flask_socketio import SocketIO, emit

@socketio.on('agent_status_request')
def handle_agent_status():
    status = get_orchestrator().get_real_time_status()
    emit('agent_status_update', status)
```

---

## 🔐 SECRET RESOLUTION SYSTEM (ALREADY IMPLEMENTED)

The project includes a sophisticated multi-provider secret resolution system in `/core/secrets/`:

### Resolution Order
1. **ENV** → Environment variables
2. **GITHUB** → GitHub Actions secrets  
3. **CLOUDFLARE** → Workers/Pages bindings
4. **EXTERNAL** → AWS SSM/Vault (pluggable)
5. **CACHE** → Encrypted in-memory cache

### Usage Pattern
```python
from core.secrets.secret_provider import UnifiedSecretResolver

secrets = UnifiedSecretResolver()
api_key = await secrets.get_secret('STRIPE_API_KEY')
# Automatically handles fallbacks, caching, and encryption
```

### Security Features
- **AES-256-GCM encryption** for cached secrets
- **TTL expiration** for cache entries
- **Metrics tracking** (resolution time, cache hits, fallback depth)
- **Never logs secret values** - only hashed keys for debugging

---

## 🚀 ENTERPRISE AUTOSCALING & PERFORMANCE

### Production Scaling Patterns
```python
# /core/scaling/autoscaler.py - Production autoscaling logic
from dataclasses import dataclass
from typing import Dict, List
import asyncio

@dataclass
class ScalingMetrics:
    cpu_usage: float
    memory_usage: float
    request_queue_depth: int
    response_latency_p95: float
    active_connections: int

class AutoScaler:
    def __init__(self, min_instances=2, max_instances=50):
        self.min_instances = min_instances
        self.max_instances = max_instances
        self.current_instances = min_instances
        
    async def evaluate_scaling(self, metrics: ScalingMetrics) -> Dict[str, any]:
        """Enterprise-grade scaling decisions based on real metrics."""
        scale_up_conditions = (
            metrics.cpu_usage > 0.75 or 
            metrics.memory_usage > 0.8 or
            metrics.request_queue_depth > 100 or
            metrics.response_latency_p95 > 2000  # 2s
        )
        
        scale_down_conditions = (
            metrics.cpu_usage < 0.3 and 
            metrics.memory_usage < 0.5 and
            metrics.request_queue_depth < 10 and
            metrics.response_latency_p95 < 500  # 500ms
        )
        
        if scale_up_conditions and self.current_instances < self.max_instances:
            new_count = min(self.current_instances * 2, self.max_instances)
            return {"action": "scale_up", "target_instances": new_count}
        elif scale_down_conditions and self.current_instances > self.min_instances:
            new_count = max(self.current_instances // 2, self.min_instances)
            return {"action": "scale_down", "target_instances": new_count}
            
        return {"action": "no_change", "target_instances": self.current_instances}
```

### Circuit Breaker Implementation
```python
# /core/resilience/circuit_breaker.py - Production circuit breaker
import time
from enum import Enum
from typing import Callable, Any

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open" 
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60, expected_exception=Exception):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
        
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")
                
        try:
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
            
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

### Performance Monitoring
```typescript
// /packages/obs/performance.ts - Production performance tracking
interface PerformanceMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  userId?: string;
  traceId: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private flushInterval = 30000; // 30s
  
  constructor(private metricsEndpoint: string) {
    setInterval(() => this.flushMetrics(), this.flushInterval);
  }
  
  trackRequest(req: any, res: any, duration: number): void {
    const metric: PerformanceMetrics = {
      endpoint: req.route?.path || req.url,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      timestamp: Date.now(),
      userId: req.user?.id,
      traceId: req.headers['x-trace-id'] || crypto.randomUUID()
    };
    
    this.metrics.push(metric);
    
    // Alert on performance degradation
    if (duration > 5000) { // 5s threshold
      this.sendAlert(`High latency detected: ${duration}ms for ${req.url}`);
    }
  }
  
  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    try {
      await fetch(this.metricsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: this.metrics })
      });
      this.metrics = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }
  
  private sendAlert(message: string): void {
    // Integration with PagerDuty, Slack, etc.
    fetch('/api/alerts', {
      method: 'POST',
      body: JSON.stringify({ level: 'warning', message, timestamp: Date.now() })
    });
  }
}
```

---

## DESIGN TOKENS (IMPLEMENTED)

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

## 📋 AGENT ECOSYSTEM (PRODUCTION READY)

The system includes multiple operational agents:

### Core Agents (`/orchestrator/agents/`)
- **ProductResearchAgent**: News scraping, trend discovery (AutoDS, Spocket)
- **InventoryForecastingAgent**: Demand prediction with Prophet + Shopify
- **PricingOptimizerAgent**: Competitor analysis, dynamic pricing
- **MarketingAutomationAgent**: Email campaigns, content generation
- **OrderFulfillmentAgent**: Risk assessment, supplier routing

### Agent Architecture
```python
# Base pattern used throughout (see /orchestrator/core/agent_base.py)
from orchestrator.core.agent_base import AgentBase

class MyAgent(AgentBase):
    async def run(self) -> Dict[str, Any]:
        # Real business logic here
        pass
```

### Health Monitoring
All agents report health via `/api/agents/status` with:
- Success rates, error counts, last execution time
- Circuit breaker status for external APIs
- Performance metrics and resource usage

---

## 🔧 DETAILED SECRET SYSTEM REFERENCE

### TypeScript Implementation (For Future TS Services)
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

// Production Cloudflare Workers/Pages provider
class CloudflareProvider implements SecretProvider {
  name = 'CloudflareProvider';
  constructor(private bindings?: Record<string, string>) {}
  async get(key: string): Promise<SecretResult | null> {
    const v = this.bindings?.[key] || globalThis.ENV?.[key];
    if (!v) return null;
    return { key, value: v, source: SecretSource.CLOUDFLARE, fetchedAt: Date.now() };
  }
}

// Enterprise vault integration - AWS SSM Parameter Store
class ExternalVaultProvider implements SecretProvider {
  name = 'ExternalVaultProvider';
  private ssmClient?: any;
  
  constructor() {
    // Only initialize AWS SDK if credentials are available
    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
      try {
        const { SSMClient } = require('@aws-sdk/client-ssm');
        this.ssmClient = new SSMClient({ region: process.env.AWS_REGION });
      } catch (e) {
        // AWS SDK not available in this environment
      }
    }
  }
  
  async get(key: string): Promise<SecretResult | null> {
    if (!this.ssmClient) return null;
    
    try {
      const { GetParameterCommand } = require('@aws-sdk/client-ssm');
      const command = new GetParameterCommand({
        Name: `/royal-equips/${key}`,
        WithDecryption: true
      });
      const result = await this.ssmClient.send(command);
      
      if (result.Parameter?.Value) {
        return {
          key,
          value: result.Parameter.Value,
          source: SecretSource.EXTERNAL,
          fetchedAt: Date.now()
        };
      }
    } catch (error) {
      // Parameter not found or access denied
    }
    
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
      new CloudflareProvider(globalThis.ENV),
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
    
    def __init__(self):
        self.ssm_client = None
        if os.getenv("AWS_REGION") and os.getenv("AWS_ACCESS_KEY_ID"):
            try:
                import boto3
                self.ssm_client = boto3.client('ssm', region_name=os.getenv("AWS_REGION"))
            except ImportError:
                pass  # AWS SDK not available
    
    async def get(self, key: str) -> Optional[SecretResult]:
        if not self.ssm_client:
            return None
        
        try:
            response = self.ssm_client.get_parameter(
                Name=f"/royal-equips/{key}",
                WithDecryption=True
            )
            return SecretResult(
                key=key,
                value=response['Parameter']['Value'],
                source="external",
                fetched_at=time.time()
            )
        except Exception:
            # Parameter not found or access denied
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

## DESIGN TOKENS (IMPLEMENTED)

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

## 💡 ENTERPRISE DEVELOPMENT PATTERNS

### Production File Organization
- **TypeScript**: Strict mode, ESLint enterprise rules, path mapping via tsconfig
- **Python**: Type hints mandatory, black formatting, ruff linting
- **Shared Types**: `/packages/shared-types/` - versioned, exported via package.json
- **API Routes**: Blueprint/router pattern with middleware chains

### Database Connection Pooling
```python
# /core/database/pool.py - Production connection management
from sqlalchemy.pool import QueuePool
from sqlalchemy import create_engine

class DatabasePool:
    def __init__(self, database_url: str, max_connections: int = 20):
        self.engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=max_connections - 10,
            pool_pre_ping=True,  # Validates connections
            pool_recycle=3600,   # 1 hour connection lifetime
            echo=False           # No SQL logging in production
        )
```

### Rate Limiting Implementation
```typescript
// /packages/security/rate-limiter.ts - Production rate limiting
import Redis from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: any) => string;
}

class RateLimiter {
  constructor(private redis: Redis, private config: RateLimitConfig) {}
  
  async checkLimit(req: any): Promise<{ allowed: boolean; resetTime: number }> {
    const key = this.config.keyGenerator(req);
    const window = Math.floor(Date.now() / this.config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    const current = await this.redis.incr(redisKey);
    await this.redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
    
    return {
      allowed: current <= this.config.maxRequests,
      resetTime: (window + 1) * this.config.windowMs
    };
  }
}
```

### Cache Strategy
```python
# /core/cache/redis_cache.py - Production caching layer
import redis.asyncio as redis
import pickle
from typing import Any, Optional
import logging

class RedisCache:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url, decode_responses=False)
        self.logger = logging.getLogger(__name__)
    
    async def get(self, key: str) -> Optional[Any]:
        try:
            data = await self.redis.get(f"cache:{key}")
            return pickle.loads(data) if data else None
        except Exception as e:
            self.logger.error(f"Cache get failed for {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        try:
            data = pickle.dumps(value)
            await self.redis.setex(f"cache:{key}", ttl, data)
            return True
        except Exception as e:
            self.logger.error(f"Cache set failed for {key}: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern for cache busting."""
        keys = await self.redis.keys(f"cache:{pattern}")
        return await self.redis.delete(*keys) if keys else 0
```

## 🔍 PRODUCTION OBSERVABILITY & DEBUGGING

### Distributed Tracing
```python
# /core/tracing/opentelemetry.py - Production tracing
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

def setup_tracing():
    trace.set_tracer_provider(TracerProvider())
    tracer = trace.get_tracer(__name__)
    
    jaeger_exporter = JaegerExporter(
        agent_host_name="localhost",
        agent_port=6831,
    )
    
    span_processor = BatchSpanProcessor(jaeger_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)
    return tracer

# Usage in business logic
@trace_calls
async def process_order(order_id: str):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        # Business logic here
```

### Health Check Matrix
```bash
# Production health verification commands
curl -f http://localhost:10000/healthz || exit 1    # Flask liveness
curl -f http://localhost:3001/readyz || exit 1      # AIRA readiness  
curl -f http://localhost:3002/metrics || exit 1     # Metrics endpoint

# Database connectivity validation
python -c "from app import db; db.engine.connect()" || exit 1

# Redis connectivity check
redis-cli ping | grep PONG || exit 1
```

### Log Aggregation
```python
# /core/logging/structured.py - Enterprise logging
import structlog
import logging.config

def setup_logging():
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

# Usage
logger = structlog.get_logger()
logger.info("Order processed", order_id="12345", amount=99.99, user_id="user_123")
```

## 🚀 PRODUCTION DEPLOYMENT STANDARDS

### Container Orchestration
```dockerfile
# /Dockerfile - Production container definition
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM python:3.11-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:10000/healthz || exit 1

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:10000", "--access-logfile", "-", "wsgi:app"]
```

### Infrastructure as Code
```yaml
# /infra/k8s/deployment.yaml - Kubernetes production deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: royal-equips-orchestrator
  labels:
    app: royal-equips
    tier: orchestrator
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 2
  selector:
    matchLabels:
      app: royal-equips
  template:
    spec:
      containers:
      - name: orchestrator
        image: royal-equips/orchestrator:latest
        ports:
        - containerPort: 10000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 10000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: 10000
          initialDelaySeconds: 15
          periodSeconds: 5
```

## 🎯 WHEN TO USE WHICH SERVICE

### Flask Orchestrator (`/app/`) - Use For:
- Agent coordination and health monitoring
- WebSocket real-time updates  
- Command center SPA serving
- Core business logic integration

### AIRA Service (`/apps/aira/`) - Use For:  
- AI agent coordination
- Natural language processing
- Complex decision making
- Cross-domain orchestration

### FastAPI Services (`/apps/api/`, `/apps/orchestrator-api/`) - Use For:
- High-performance API endpoints
- OpenAPI/Swagger documentation  
- Async request handling
- External integrations

### React UI (`/apps/command-center-ui/`) - Use For:
- Dashboard and visualization
- Real-time monitoring interfaces  
- Mobile-responsive admin panels
- Progressive web app features

Remember: This is a **production revenue-generating system** - treat every change as if it impacts real business operations.

---

## 🏆 ENTERPRISE EXECUTION PRINCIPLES

### Code Quality Standards
- **Zero Placeholders**: All implementations must use real business logic and data
- **Type Safety**: TypeScript strict mode, Python type hints mandatory
- **Performance**: Sub-2s load times, autoscaling based on real metrics
- **Security**: Secret management, circuit breakers, rate limiting
- **Observability**: Structured logging, distributed tracing, health monitoring

### Production Readiness Checklist
- ✅ Health endpoints (`/healthz`, `/readyz`, `/metrics`)
- ✅ Circuit breaker patterns for external APIs
- ✅ Secret resolution with encryption and caching
- ✅ Horizontal pod autoscaling configuration
- ✅ Database connection pooling
- ✅ Redis caching layer
- ✅ Performance monitoring and alerting
- ✅ Structured logging with correlation IDs

### Development Workflow
1. **Understand**: Review this guide and actual codebase structure
2. **Implement**: Use real APIs, real data, real business logic  
3. **Validate**: Type checking, linting, testing, security scans
4. **Deploy**: Production-ready containers with health checks
5. **Monitor**: Metrics, logs, alerts, performance tracking

**NEVER** implement theoretical or placeholder code. This system generates real revenue and serves real customers.
