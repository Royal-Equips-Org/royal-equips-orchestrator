# ROYAL EQUIPS ORCHESTRATOR — AI Development Guide

## 🏰 System Overview

Production e-commerce platform with autonomous AI agents managing product research, inventory, marketing, and fulfillment. **No placeholders or mock data** - all integrations are real.

### Architecture
- **Hybrid monorepo**: Python (Flask orchestrator) + TypeScript (React UI, limited packages via pnpm)
- **Flask** (`/app/`, `/wsgi.py`) - main orchestrator API, agent coordination, health monitoring (port 10000)
- **FastAPI services** (planned) - `/apps/aira/`, `/apps/api/`, `/apps/orchestrator-api/` (ports 3000-3003)
- **React UI** - `/apps/command-center-ui/` with Vite + lazy loading (port 5173)
- **Agent system** - `/orchestrator/core/` (orchestrator.py, agent_base.py) + `/orchestrator/agents/` (implementations)
- **Shared utilities** - `/core/` (secrets, health, logging, security)

## 🚨 Critical Rules

1. **No mock data or placeholders** - system generates real revenue. Use actual API integrations (Shopify, AutoDS, Spocket).
2. **Agent pattern** - All agents inherit from `orchestrator.core.agent_base.AgentBase`, implement `async def _execute_task()`.
3. **Multi-service coordination** - Flask main API delegates to `/orchestrator/core/orchestrator.py` for agent management.
4. **Secret management** - Use `/core/secrets/secret_provider.py` (UnifiedSecretResolver) - cascades ENV → GitHub → Cloudflare → cache.
5. **Health monitoring** - All services expose `/healthz` (liveness), `/readyz` (readiness), `/metrics` endpoints.

## 🏗️ Project Structure (Key Paths)

```
/app/                           # Flask application
  ├── routes/                   # Blueprints: agents.py, empire.py, command_center.py, health.py
  ├── services/                 # Business logic: health_service.py, empire_service.py
  └── __init__.py               # App factory with config
/wsgi.py                        # Production WSGI entry point (Gunicorn)
/orchestrator/
  ├── core/                     # orchestrator.py (registers/schedules agents), agent_base.py
  └── agents/                   # product_research.py, inventory_pricing.py, marketing_automation.py, etc.
/core/                          # Shared utilities
  ├── secrets/                  # secret_provider.py (multi-provider resolution)
  ├── health_service.py         # Circuit breakers, dependency monitoring
  └── security/                 # Auth, encryption, HMAC validation
/apps/command-center-ui/        # React+Vite dashboard (separate pnpm workspace)
  └── src/modules/              # Lazy-loaded: aira/, agents/, analytics/, dashboard/
/royal_platform/                # E-commerce integrations (Shopify, suppliers)
/royal_mcp/                     # Model Context Protocol server
```

## 🔧 Development Workflows

### Setup and Running
```bash
# Python setup (virtualenv recommended)
make setup              # Creates .venv, installs requirements.txt
python wsgi.py          # Start Flask (dev mode with auto-reload)
gunicorn -w 2 -b 0.0.0.0:10000 wsgi:app  # Production mode

# Frontend (React UI)
cd apps/command-center-ui && pnpm install && pnpm dev  # Port 5173

# Combined (if using top-level package.json)
pnpm install            # Installs UI workspace dependencies
pnpm dev                # Runs Flask + React concurrently
```

### Testing and Quality
```bash
# Python (see Makefile, pyproject.toml)
make test               # pytest tests/ -v
make coverage           # pytest with coverage report
make lint               # ruff check .
make typecheck          # mypy royal_mcp/ (limited scope)
make ci                 # Complete pipeline: lint + typecheck + test + scan

# TypeScript (React UI)
cd apps/command-center-ui && pnpm typecheck && pnpm lint && pnpm test
```

### Key Configuration Files
- `pyproject.toml` - Python project config, ruff/black/pytest settings
- `Makefile` - Common development tasks (setup, test, lint, ci)
- `.env.example` - Required environment variables template
- `pnpm-workspace.yaml` - Workspace definition (only includes command-center-ui, shared-types)

## 🎯 Operational Agents (Implemented)

Located in `/orchestrator/agents/`:
- **ProductResearchAgent** - AutoDS/Spocket integration, trend scoring, product discovery
- **InventoryPricingAgent** - Demand forecasting, dynamic pricing, multi-channel sync
- **MarketingAutomationAgent** - Email campaigns, segmentation, abandon cart recovery
- **OrderFulfillmentAgent** - Risk assessment, supplier routing, tracking
- **AnalyticsAgent** - BigQuery integration, metrics aggregation
- **CustomerSupportAgent** - AI classification, sentiment analysis
- **SecurityAgent** - Fraud detection, vulnerability scanning

All agents follow pattern in `/orchestrator/core/agent_base.py`:
```python
class MyAgent(AgentBase):
    def __init__(self, name: str):
        super().__init__(name, agent_type="custom", description="...")
    
    async def _agent_initialize(self):
        # One-time setup (API clients, DB connections)
        pass
    
    async def _execute_task(self):
        # Main logic - called by orchestrator on schedule
        # Return dict with results or raise exception
        pass
```

## 🏗️ Key Architecture Patterns

### Agent Registration & Execution
```python
# /orchestrator/core/orchestrator.py - Central coordinator
orchestrator = Orchestrator()
orchestrator.register_agent(ProductResearchAgent("ProductResearch"), interval=3600)  # Run every hour
orchestrator.start()  # Starts asyncio tasks for all agents

# Flask routes bridge to orchestrator (see /app/routes/agents.py)
from app.orchestrator_bridge import get_orchestrator
orchestrator = get_orchestrator()
health = await orchestrator.health()  # Returns status of all agents
```

### Secret Resolution (Multi-Provider Cascade)
```python
# /core/secrets/secret_provider.py - Cascades through providers until found
from core.secrets.secret_provider import UnifiedSecretResolver

secrets = UnifiedSecretResolver()
api_key = await secrets.get_secret('SHOPIFY_API_KEY')
# Order: ENV vars → GitHub Actions secrets → Cloudflare bindings → AWS SSM → encrypted cache
```

### Health Monitoring with Circuit Breakers
```python
# /core/health_service.py - Prevents cascade failures
from core.health_service import HealthService

health = HealthService()
status = health.check_readiness()  # Tests optional dependencies (Shopify, BigQuery, GitHub)
# Circuit states: CLOSED (ok) → OPEN (failing, requests blocked) → HALF_OPEN (testing recovery)
```

### React Lazy Module Loading
```typescript
// /apps/command-center-ui/src/App.tsx - Code splitting by module
const AiraModule = lazy(() => import('./modules/aira/AiraModule'));
<Suspense fallback={<LoadingSpinner />}>
  <AiraModule />
</Suspense>
// Zustand stores: /stores/empireStore.ts, /stores/navigationStore.ts
```

### Flask Blueprint Organization
```python
# /app/routes/ - Modular route blueprints
from flask import Blueprint
agents_bp = Blueprint('agents', __name__, url_prefix='/agents')

@agents_bp.route('/status')
def get_agents_status():
    # All blueprints registered in /app/__init__.py
```

## 🔌 Integration Patterns

### E-commerce Platform Integrations
- **Shopify** - `/royal_platform/` with GraphQL client (`/app/services/shopify_graphql_service.py`)
- **AutoDS** - Dropshipping automation, product sourcing
- **Spocket** - EU supplier integration for faster shipping
- **BigQuery** - Analytics data warehouse (optional dependency)

### External Service Communication
```python
# /orchestrator/integrations/ - API client wrappers
# Real API calls with retry logic (tenacity), no mocks
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def fetch_products():
    # Real implementation with error handling
```

## 🚀 Deployment & Production

### Docker Deployment
- `Dockerfile` - Multi-stage build with Python 3.11, Gunicorn WSGI server
- `docker-compose.yml` - Full stack (Flask, Redis, PostgreSQL, RabbitMQ)
- Health checks integrated: `HEALTHCHECK CMD curl -f http://localhost:10000/healthz || exit 1`

### Environment Configuration
Required variables (see `.env.example`):
```bash
# Flask
FLASK_ENV=production
SECRET_KEY=<generated-secret>
PORT=10000

# E-commerce
SHOPIFY_STORE=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=<token>
AUTO_DS_API_KEY=<key>

# Optional
BIGQUERY_PROJECT_ID=<project>
SUPABASE_URL=<url>
SUPABASE_ANON_KEY=<key>
```

### CI/CD (GitHub Actions)
- `.github/workflows/` - Automated testing, building, security scans
- CodeQL scanning for vulnerabilities
- Automated Docker image builds on push to main

## 💡 Project-Specific Conventions

1. **Agent naming** - Use descriptive names like `ProductResearchAgent`, suffix with `Agent`
2. **Async by default** - All agent methods are async (`async def _execute_task()`)
3. **Error handling** - Raise exceptions in agents; orchestrator logs and continues
4. **Health endpoints** - Plain text "ok" for `/healthz`, JSON with dependency status for `/readyz`
5. **Blueprint prefixes** - All Flask routes use blueprints with URL prefixes (e.g., `/agents`, `/empire`)
6. **Type hints encouraged** - Python 3.10+ type hints, but not strictly enforced (mypy runs on `royal_mcp/` only)
7. **Testing markers** - Use pytest markers: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.slow`

## 📚 Key Documentation Files

- `docs/architecture.md` - Detailed system architecture, component interactions
- `README.md` - Project overview, agent status, quick start
- `AGENT_INSTRUCTIONS.md` - Comprehensive agent development blueprint (for reference)
- `docs/copilot_prompt.md` - Original AI coding instructions (historical)
- `Makefile` - All common development commands documented with `make help`

## 🔍 Debugging Tips

1. **Agent not running?** Check orchestrator logs in Flask console, verify agent registered in startup
2. **Secret not found?** Verify cascading order: ENV > GitHub > Cloudflare. Check `/core/secrets/secret_provider.py` logs
3. **Health endpoint failing?** Check circuit breaker states in `/core/health_service.py`, optional dependencies may be unavailable
4. **React UI not loading?** Ensure Flask serves static files from `/app/static/`, check CORS settings in `/app/__init__.py`
5. **Tests failing?** Run `make test` to see detailed output. Use `-v --tb=short` for pytest verbosity

## ⚠️ Common Pitfalls

- **Don't import from `/apps/` in Python code** - TypeScript apps are separate, not Python modules
- **Don't use `from app import app`** - Use app factory pattern, import from `app/__init__.py:create_app()`
- **Don't skip agent initialization** - Always call `await agent.initialize()` before first run
- **Don't hardcode secrets** - Always use `UnifiedSecretResolver` or environment variables
- **Don't block event loop** - Use `asyncio.sleep()` not `time.sleep()` in async functions

## 🎯 Where to Start as an AI Agent

1. **Understand agent pattern**: Read `/orchestrator/core/agent_base.py` and one example in `/orchestrator/agents/`
2. **Set up environment**: Run `make setup` then `python wsgi.py` to verify Flask starts
3. **Explore Flask routes**: Check `/app/routes/` to see API endpoints, understand blueprint pattern
4. **Review health system**: Look at `/core/health_service.py` to understand circuit breakers
5. **Check existing agents**: See `/orchestrator/agents/product_research.py` for real integration example

Remember: This is a **production system generating real revenue**. All changes must use real APIs, no mock data.
