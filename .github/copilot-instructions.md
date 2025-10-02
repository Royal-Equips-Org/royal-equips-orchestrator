# ROYAL EQUIPS ORCHESTRATOR — AI Development Guide

**Last Updated:** 2025-01-02  
**System Version:** 2.x  
**Maintainer:** @Skidaw23

## 🏰 System Overview

Production e-commerce platform with autonomous AI agents managing product research, inventory, marketing, and fulfillment. **No placeholders or mock data** - all integrations are real.

### Architecture
- **Hybrid monorepo**: Python (Flask orchestrator) + TypeScript (React UI, limited packages via pnpm)
- **Flask** (`/app/`, `/wsgi.py`) - main orchestrator API, agent coordination, health monitoring (port 10000)
- **FastAPI services** - `/apps/aira/`, `/apps/api/`, `/apps/orchestrator-api/` (ports 3000-3003)
- **React UI** - `/apps/command-center-ui/` with Vite + lazy loading (port 5173)
- **Agent system** - `/orchestrator/core/` (orchestrator.py, agent_base.py) + `/orchestrator/agents/` (implementations)
- **Shared utilities** - `/core/` (secrets, health, logging, security)

### Service Responsibilities
- **Flask (port 10000)** - Main orchestrator, agent coordination, health monitoring, WebSocket support
- **FastAPI services (3000-3003)** - Specialized microservices (AIRA AI assistant, API gateways, orchestrator API)
- **React UI (5173)** - Command center dashboard, served by Vite in dev, built static assets served by Flask in production

## ⚡ Quick Start Checklist for New AI Agents/Developers

### Discovery First
- [ ] Review `reports/STACK_REPORT.md` for a living snapshot of active providers, services, ports, health endpoints, CI/CD gates, and known gaps across the orchestrator. This establishes the current production shape before any local changes.
- [ ] Read `docs/RUNBOOK.md` for end-to-end operational procedures covering environment bootstrapping, deployment and rollback workflows, required secrets, and on-call escalation paths. Use this as the canonical run sequence.

### First 15 Minutes
- [ ] Clone repository: `git clone https://github.com/Royal-Equips-Org/royal-equips-orchestrator.git`
- [ ] Copy environment template: `cp .env.example .env`
- [ ] Set up Python environment: `make setup` (creates virtualenv, installs dependencies)
- [ ] Start Flask server: `python wsgi.py` (should start on port 10000)
- [ ] Verify health: `curl http://localhost:10000/healthz` (should return "ok")

### Next 30 Minutes
- [ ] Read this guide completely (you're doing it! 📖)
- [ ] Explore agent base class: `view /orchestrator/core/agent_base.py`
- [ ] Check existing agent example: `view /orchestrator/agents/product_research.py`
- [ ] Review Flask app structure: `view /app/__init__.py`
- [ ] Understand secret management: `view /core/secrets/secret_provider.py`

### Development Workflow (Day 1)
- [ ] Create feature branch: `git checkout -b feature/your-feature`
- [ ] Make minimal changes following patterns in existing code
- [ ] Run tests: `make test`
- [ ] Run linter: `make lint`
- [ ] Commit with conventional commits: `git commit -m "feat: description"`
- [ ] Open PR to `develop` branch
- [ ] Before requesting deploy, review deployment/rollback steps against `docs/RUNBOOK.md` and `reports/STACK_REPORT.md`.

### Creating Your First Agent
- [ ] Copy agent template from existing agent (e.g., `product_research.py`)
- [ ] Implement `_agent_initialize()` for setup
- [ ] Implement `_execute_task()` with main logic
- [ ] Add agent to registry in `/app/__init__.py:init_autonomous_empire()`
- [ ] Test agent locally: `python wsgi.py` and check logs
- [ ] Add tests in `/tests/test_agents.py`

### Production Readiness Checklist
- [ ] Agent has proper error handling (try/except blocks)
- [ ] Secrets loaded via `UnifiedSecretResolver`
- [ ] Retry logic added for external API calls (tenacity)
- [ ] Health check implemented
- [ ] Logging added at key points
- [ ] Tests written (unit + integration)
- [ ] Documentation updated (docstrings + README if needed)
- [ ] Deployment + rollback steps verified against `docs/RUNBOOK.md` and cross-checked with live service inventory in `reports/STACK_REPORT.md`

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
➡️ **Reference:** `docs/RUNBOOK.md` includes detailed environment bootstrap, secret provisioning, and multi-service startup coordination steps aligned with the architecture captured in `reports/STACK_REPORT.md`.
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

⚠️ **TypeScript workspace is limited** - Only `/apps/command-center-ui/` and `/packages/shared-types/` use pnpm workspace. FastAPI services in `/apps/aira/`, `/apps/api/` are Python-only and not part of the workspace.

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
        # Called once before agent starts operating
        self.api_client = await setup_api_client()
        pass
    
    async def _execute_task(self):
        # Main logic - called by orchestrator on schedule
        # Return dict with results or raise exception
        result = await self._do_work()
        return {"status": "success", "data": result}
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

### Agent Registration Location
Agents are registered in **two locations** depending on the pattern used:

1. **Modern pattern (AgentRegistry)**: `/app/__init__.py:init_autonomous_empire()`
   - Called during Flask app initialization
   - Uses `AgentRegistry` from `/orchestrator/core/agent_registry.py`
   - Imports from `/orchestrator/core/agent_bootstrap.py:initialize_all_agents()`
   - Background thread initializes agents asynchronously

2. **Legacy pattern (direct orchestrator)**: `/wsgi.py` or startup script
   - Direct orchestrator instantiation
   - Useful for standalone agent testing

**Recommended**: Use modern AgentRegistry pattern. See existing agents in `/orchestrator/agents/` for examples.

```python
# Example from /app/__init__.py
from orchestrator.core.agent_registry import get_agent_registry, AgentCapability

registry = get_agent_registry()
await registry.register_agent(
    agent_id="product_research",
    name="Product Research Agent",
    agent_type="research",
    capabilities=[AgentCapability.DATA_COLLECTION, AgentCapability.ANALYSIS]
)
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
- **BigQuery** - Analytics data warehouse (optional dependency, implemented)

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
7. **Testing markers** - Recommended: use pytest markers such as `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.slow` (adopt when adding or updating tests)

### Testing Marker Examples
```python
# Example test with markers
@pytest.mark.unit
async def test_agent_initialization():
    """Unit test for agent initialization."""
    agent = MyAgent("test")
    await agent.initialize()
    assert agent.status == AgentStatus.IDLE

@pytest.mark.integration
@pytest.mark.slow
async def test_shopify_product_sync():
    """Integration test with real Shopify API."""
    agent = ProductResearchAgent("ProductResearch")
    result = await agent._execute_task()
    assert result["status"] == "success"

@pytest.mark.asyncio
async def test_agent_error_handling():
    """Test agent error handling."""
    agent = MyAgent("test")
    with pytest.raises(ValueError):
        await agent._execute_task()
```

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

### Agent-Specific Troubleshooting
- **Agent stuck in loop?** Check `_execute_task()` returns within timeout (default 300s). Add logging to identify bottlenecks
- **Memory leaks?** Verify async cleanup in `_agent_initialize()` counterpart. Close connections in `finally` blocks
- **Rate limits hit?** Review retry logic and exponential backoff config in agent code. Adjust `tenacity` decorator parameters
- **Agent status shows ERROR?** Check agent logs for exceptions. Orchestrator catches errors and continues with other agents
- **Orchestrator not starting agents?** Verify agent registration in `/app/__init__.py:init_autonomous_empire()`. Check for import errors

## ⚠️ Common Pitfalls

- **Don't import from `/apps/` in Python code** - TypeScript apps are separate, not Python modules
- **Don't use `from app import app`** - Use app factory pattern, import from `app/__init__.py:create_app()`
- **Don't skip agent initialization** - Always call `await agent.initialize()` before first run
- **Don't hardcode secrets** - Always use `UnifiedSecretResolver` or environment variables
- **Don't block event loop** - Use `asyncio.sleep()` not `time.sleep()` in async functions

## 🗄️ Database Migrations

The system uses **Alembic** for database schema migrations. While currently optional, the infrastructure is in place.

### Migration Strategy
- **Location**: `/alembic_migrations/` with `alembic.ini` configuration
- **Template**: `/alembic_migrations/script.py.mako` for generating migration files
- **Current State**: Alembic configured but migrations are optional (system primarily uses Supabase/external DBs)
- **When to use**: If adding local PostgreSQL models or changing schema

### Common Migration Commands
```bash
# Generate new migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

**Note**: Most data storage uses external services (Supabase, BigQuery), so migrations are primarily for local/dev databases.

## 🔐 Local Development Secrets

### Bootstrapping Secrets Locally

1. **Copy template**: `cp .env.example .env`
2. **Add minimum required secrets**:
   ```bash
   # Minimal for local development
   SECRET_KEY=dev-secret-key-$(openssl rand -hex 32)
   FLASK_ENV=development
   PORT=10000
   
   # Optional: Add e-commerce keys for full functionality
   SHOPIFY_API_KEY=your-key
   SHOPIFY_ACCESS_TOKEN=your-token
   ```

3. **React UI secrets**: Create `apps/command-center-ui/.env.local`:
   ```bash
   VITE_API_BASE_URL=http://localhost:10000
   VITE_API_URL=http://localhost:10000
   ```

4. **Secret resolution order**: The system will cascade through:
   - Environment variables (`.env` file)
   - GitHub Actions secrets (CI/CD only)
   - Cloudflare Workers bindings (production)
   - Encrypted cache (fallback)

### Development Without Secrets
The system is designed to run with minimal secrets. Optional integrations gracefully degrade:
- **Shopify**: Agent operations limited, but system starts
- **OpenAI**: Customer support agent disabled
- **BigQuery**: Analytics export disabled
- **Sentry**: Error monitoring disabled (logged warnings only)

## 🚀 React UI Build Process

### Development Mode
```bash
cd apps/command-center-ui
pnpm install
pnpm run dev  # Vite dev server on port 5173
```

### Production Build
```bash
cd apps/command-center-ui
pnpm run build  # Outputs to dist/
```

### Serving in Production
- **Development**: Vite dev server (port 5173), separate from Flask
- **Production**: Flask serves static files from `/app/static/` (built React assets copied here)
- **Cloudflare Pages**: Can deploy React UI separately, pointing API_BASE_URL to Flask backend

### Build Integration
The React UI and Flask backend are **independent in development** but **integrated in production**:
- Flask serves the built React app from static files
- CORS configured in `/app/__init__.py` for cross-origin dev mode
- WebSocket support via SocketIO for real-time updates

## 🧪 Testing Strategy

### Test Organization
```
tests/
├── unit/           # Fast, isolated tests (mock external dependencies)
├── integration/    # Tests with real API calls (optional dependencies)
├── e2e/            # End-to-end browser tests
└── python/         # Python-specific tests
```

### Testing with External APIs
- **No VCR.py currently**: Tests use real API calls or mocks via `unittest.mock`
- **Integration tests**: Marked with `@pytest.mark.integration`, require real API keys
- **CI/CD**: Integration tests skipped in CI unless secrets available
- **Recommendation**: Add VCR.py/pytest-vcr for recording HTTP interactions in future

### Running Tests
```bash
# All tests
make test

# Unit tests only
pytest tests/unit -v

# Integration tests (requires API keys)
pytest tests/integration -v -m integration

# Skip slow tests
pytest -v -m "not slow"

# With coverage
make coverage
```

## 📊 Monitoring & Observability

### Sentry Error Tracking
- **Backend DSN**: Configured via `SENTRY_DSN` environment variable
- **Frontend DSN**: `VITE_SENTRY_DSN` in React UI
- **Setup Guide**: See `SENTRY_INTEGRATION.md` for complete instructions
- **Features**: Error tracking, performance monitoring, user session replay

### Health Monitoring
- **Endpoints**: `/healthz` (liveness), `/readyz` (readiness), `/metrics` (Prometheus)
- **Circuit Breakers**: Automatic failure detection and recovery
- **Dashboard**: Recommend Datadog, Grafana, or Sentry for production monitoring

### Logging
- **Level**: Controlled via `LOG_LEVEL` environment variable (default: INFO)
- **Format**: Structured JSON logs in production
- **Locations**: Console output (dev), file logs (production)

### Production Monitoring Checklist
- [ ] Sentry configured for error tracking
- [ ] Health endpoints monitored (uptime checks)
- [ ] Log aggregation (CloudWatch, Datadog, or ELK stack)
- [ ] Metrics dashboard (Prometheus + Grafana recommended)
- [ ] Alert rules configured (PagerDuty, Slack integration)

## 📖 Common Agent Recipes

### Recipe 1: Creating a New Agent
```python
# /orchestrator/agents/my_new_agent.py
from orchestrator.core.agent_base import AgentBase
from core.secrets.secret_provider import UnifiedSecretResolver

class MyNewAgent(AgentBase):
    def __init__(self, name: str):
        super().__init__(name, agent_type="custom", description="My new agent")
        self.secrets = UnifiedSecretResolver()
    
    async def _agent_initialize(self):
        """Setup API clients and connections."""
        api_key = await self.secrets.get_secret('MY_API_KEY')
        self.client = MyAPIClient(api_key)
        self.logger.info(f"✅ {self.name} initialized")
    
    async def _execute_task(self):
        """Main agent logic."""
        try:
            data = await self.client.fetch_data()
            result = await self._process_data(data)
            return {"status": "success", "processed": len(result)}
        except Exception as e:
            self.logger.error(f"❌ Task failed: {e}")
            raise

# Register agent in /app/__init__.py:init_autonomous_empire()
from orchestrator.agents.my_new_agent import MyNewAgent
await registry.register_agent(
    agent_id="my_new_agent",
    name="My New Agent",
    agent_type="custom",
    capabilities=[AgentCapability.DATA_PROCESSING]
)
```

### Recipe 2: Adding External API Integration
```python
# Use retry logic for resilience
from tenacity import retry, stop_after_attempt, wait_exponential
import httpx

class MyAgent(AgentBase):
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _fetch_from_api(self, endpoint: str):
        """Fetch data with automatic retry."""
        async with httpx.AsyncClient() as client:
            response = await client.get(endpoint, timeout=30)
            response.raise_for_status()
            return response.json()
```

### Recipe 3: Scheduled Agent Task
```python
# Agents are auto-scheduled by orchestrator based on registration
# To customize schedule, modify interval during registration:

# Run every hour
orchestrator.register_agent(MyAgent("MyAgent"), interval=3600)

# Run every 15 minutes
orchestrator.register_agent(MyAgent("MyAgent"), interval=900)

# Run once per day
orchestrator.register_agent(MyAgent("MyAgent"), interval=86400)
```

### Recipe 4: Agent with Health Check
```python
class MyAgent(AgentBase):
    async def health_check(self) -> dict:
        """Custom health check for monitoring."""
        try:
            # Test critical dependencies
            api_ok = await self._test_api_connection()
            return {
                "status": "healthy" if api_ok else "degraded",
                "api_connection": api_ok,
                "last_run": self.last_execution,
                "uptime": time.time() - self.start_time
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
```

## ⚡ Performance Tuning

### Agent Performance
- **Async operations**: Always use `async/await` for I/O operations
- **Connection pooling**: Reuse HTTP clients (initialize in `_agent_initialize()`)
- **Batch operations**: Process items in batches rather than one-by-one
- **Caching**: Use Redis for frequently accessed data (see agents with `redis_cache`)

### Example: Optimized Data Processing
```python
# ❌ Slow: Sequential processing
async def _process_items(self, items):
    results = []
    for item in items:
        result = await self._process_one(item)
        results.append(result)
    return results

# ✅ Fast: Concurrent processing
async def _process_items(self, items):
    tasks = [self._process_one(item) for item in items]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

### Flask Performance
- **Production server**: Use Gunicorn with multiple workers (`gunicorn -w 4`)
- **Worker count**: `2-4 × CPU_cores` for I/O-bound workloads
- **Timeouts**: Set appropriate timeouts for long-running operations
- **Static files**: Use CDN (Cloudflare) for static assets in production

### React UI Performance
- **Code splitting**: Already implemented via lazy module loading
- **Bundle size**: Monitor with `pnpm run build` (target <1.5MB compressed)
- **Lazy loading**: Load components on-demand (see `App.tsx`)
- **Caching**: API responses cached in Zustand stores

### Database Performance
- **Connection pooling**: SQLAlchemy pooling enabled by default
- **Indexes**: Add indexes for frequently queried columns
- **Query optimization**: Use `select` over `query().all()` for large datasets
- **BigQuery**: Partition tables by date for analytics queries

### Monitoring Performance
- **Sentry traces**: Sample rate controlled by `SENTRY_TRACES_SAMPLE_RATE`
- **Health metrics**: `/metrics` endpoint exposes Prometheus metrics
- **Agent metrics**: Performance tracking built into `AgentBase`

## 🎯 Where to Start as an AI Agent

**Follow the Quick Start Checklist above** for a structured onboarding. For quick reference:

1. **Understand agent pattern**: Read `/orchestrator/core/agent_base.py` and one example in `/orchestrator/agents/`
2. **Set up environment**: Run `make setup` then `python wsgi.py` to verify Flask starts
3. **Explore Flask routes**: Check `/app/routes/` to see API endpoints, understand blueprint pattern
4. **Review health system**: Look at `/core/health_service.py` to understand circuit breakers
5. **Check existing agents**: See `/orchestrator/agents/product_research.py` for real integration example
6. **Review common recipes**: See "Common Agent Recipes" section above for practical patterns

### Additional Learning Resources
- **Agent development blueprint**: `AGENT_INSTRUCTIONS.md` - comprehensive guide to agent architecture
- **System architecture**: `docs/architecture.md` - detailed component interactions
- **API documentation**: Start Flask server and visit `/docs` for Swagger UI
- **Sentry monitoring**: `SENTRY_INTEGRATION.md` - error tracking setup

Remember: This is a **production system generating real revenue**. All changes must use real APIs, no mock data.
