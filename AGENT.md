# Royal Equips Orchestrator - Agent Development & Maintenance Guide

## System Overview

This is a production-grade e-commerce automation platform with autonomous AI agents managing the full business lifecycle. **Every component uses real API integrations—no mock data.**

### Core Architecture Principles

1. **Real Data Flow**: All data comes from actual APIs (Shopify, OpenAI, BigQuery, etc.)
2. **Agent-Based System**: Autonomous agents make decisions and execute tasks
3. **Full Stack Integration**: Flask backend + React frontend + FastAPI microservices
4. **Event-Driven**: WebSocket and webhook integrations for real-time updates
5. **Production Ready**: Built for scale with proper error handling, monitoring, and failover

---

## System Components

### Backend Services

#### 1. Flask Orchestrator (Port 10000)
**Location**: `/app/`, `/wsgi.py`
**Purpose**: Main API coordinator, agent management, health monitoring

**Key Responsibilities**:
- Agent lifecycle management (`/orchestrator/core/orchestrator.py`)
- REST API endpoints for all modules
- WebSocket support for real-time updates
- Health check aggregation
- Session management with Redis

**Critical Files**:
- `/app/__init__.py` - App factory, agent registry initialization
- `/app/routes/agents.py` - Agent API endpoints
- `/app/routes/empire.py` - Empire metrics and operations
- `/wsgi.py` - Production WSGI entry point

#### 2. FastAPI Services (Ports 3000-3003)
**Location**: `/apps/aira/`, `/apps/api/`, `/apps/orchestrator-api/`
**Purpose**: Specialized microservices

**Services**:
- **AIRA AI Assistant** (port 3000): OpenAI integration, intelligent responses
- **API Gateway** (port 3001): External API aggregation
- **Orchestrator API** (port 3002): Agent control interface

#### 3. React Command Center (Port 5173 dev / served by Flask in prod)
**Location**: `/apps/command-center-ui/`
**Purpose**: Real-time dashboard and control interface

**Key Features**:
- Lazy-loaded modules for performance
- Real-time WebSocket updates
- 3D visualizations (Three.js/React Three Fiber)
- Responsive mobile-first design

### Agent System

#### Agent Base Class
**Location**: `/orchestrator/core/agent_base.py`

All agents inherit from `AgentBase` and implement:
```python
async def _agent_initialize(self):
    """One-time setup: API clients, DB connections"""
    pass

async def _execute_task(self):
    """Main logic called by orchestrator on schedule"""
    return {"status": "success", "data": result}
```

#### Operational Agents
**Location**: `/orchestrator/agents/`

1. **ProductResearchAgent** - Market analysis, trend detection, AutoDS/Spocket integration
2. **InventoryPricingAgent** - Demand forecasting, dynamic pricing, Shopify sync
3. **MarketingAutomationAgent** - Email campaigns, segmentation, abandoned cart
4. **OrderFulfillmentAgent** - Risk assessment, supplier routing, tracking
5. **AnalyticsAgent** - BigQuery integration, metrics aggregation
6. **CustomerSupportAgent** - OpenAI-powered chat, sentiment analysis
7. **SecurityAgent** - Fraud detection, vulnerability scanning

---

## Real API Integrations

### 1. Shopify Integration
**Purpose**: E-commerce platform sync
**Files**: 
- `/royal_platform/shopify/` - Python SDK wrapper
- `/app/services/shopify_graphql_service.py` - GraphQL client

**Endpoints Used**:
- Products API - Inventory sync
- Orders API - Order management
- Customers API - Customer data
- Webhooks - Real-time updates

**Authentication**: Admin API token via `SHOPIFY_ACCESS_TOKEN`

### 2. OpenAI Integration (AIRA)
**Purpose**: AI-powered assistance and decision making
**Files**:
- `/apps/aira/` - FastAPI service
- `/orchestrator/agents/customer_support.py` - Chat integration

**Models Used**:
- GPT-4 for complex reasoning
- GPT-3.5-turbo for routine responses
- Embeddings for semantic search

**Authentication**: `OPENAI_API_KEY`

**Current Issue**: AIRA module needs OpenAI API key configuration
**Fix Required**: Ensure environment variable is set and service is initialized

### 3. BigQuery Analytics
**Purpose**: Data warehouse for analytics
**Files**:
- `/orchestrator/agents/analytics.py`
- Service account JSON for authentication

**Queries**:
- Revenue aggregation
- Performance metrics
- Predictive analytics

### 4. AutoDS/Spocket
**Purpose**: Dropshipping automation
**Files**:
- `/orchestrator/agents/product_research.py`

**Integration**: Product sourcing, inventory sync, pricing updates

---

## Critical Fixes Required

### 1. WebGL Context Error

**Issue**: "Error creating WebGL context" on command center load

**Root Cause**: Multiple Three.js Canvas components attempting to initialize simultaneously or on devices without WebGL support

**Files Affected**:
- `/apps/command-center-ui/src/command-center/ai-core/Hologram3D.tsx`
- `/apps/command-center-ui/src/components/empire/EmpireDashboard.tsx`
- `/apps/command-center-ui/src/components/holographic/*.tsx`

**Fix Strategy**:
1. Add WebGL capability detection before rendering Canvas
2. Implement graceful fallback for non-WebGL browsers
3. Lazy load 3D components only when needed
4. Reduce number of simultaneous Canvas instances

### 2. AIRA OpenAI Integration

**Issue**: AIRA not working with OpenAI API

**Files to Fix**:
- `/apps/aira/` - Ensure API key is loaded from secrets
- `/apps/command-center-ui/src/modules/aira/AiraModule.tsx` - Connect to real API endpoint
- `/core/secrets/secret_provider.py` - Verify OpenAI key resolution

**Required Environment Variables**:
```bash
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-... (optional)
OPENAI_MODEL=gpt-4 (or gpt-3.5-turbo)
```

### 3. Remove All Mock Data

**Search and Replace**:
```bash
# Find all mock data usage
grep -r "mock" --include="*.py" --include="*.ts" --include="*.tsx"

# Replace with real API calls
# Priority files:
# - /apps/command-center-ui/src/modules/*/
# - /orchestrator/agents/
```

**Verification**: Every module must fetch from actual endpoints:
- `/v1/agents` - Real agent status
- `/v1/metrics` - Real empire metrics
- `/v1/products` - Real Shopify products
- `/v1/orders` - Real order data

---

## Development Workflow

### Adding a New Agent

1. **Create Agent File**: `/orchestrator/agents/your_agent.py`
```python
from orchestrator.core.agent_base import AgentBase

class YourAgent(AgentBase):
    def __init__(self, name: str):
        super().__init__(name, agent_type="your_type", description="...")
    
    async def _agent_initialize(self):
        # Setup API clients
        self.api_key = await self.secrets.get_secret('YOUR_API_KEY')
        self.client = YourAPIClient(self.api_key)
    
    async def _execute_task(self):
        # Main logic
        result = await self.client.do_work()
        return {"status": "success", "data": result}
```

2. **Register Agent**: `/app/__init__.py`
```python
from orchestrator.core.agent_registry import get_agent_registry
registry = get_agent_registry()
await registry.register_agent(
    agent_id="your_agent",
    name="Your Agent",
    agent_type="your_type",
    capabilities=[AgentCapability.DATA_COLLECTION]
)
```

3. **Add Tests**: `/tests/test_agents.py`

4. **Update Documentation**: This file

### Adding a New Frontend Module

1. **Create Module**: `/apps/command-center-ui/src/modules/your-module/`
```tsx
export default function YourModule() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // Fetch real data
    fetch('/v1/your-endpoint')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return <div>{/* Your UI */}</div>;
}
```

2. **Register in Router**: `/apps/command-center-ui/src/App.tsx`
```tsx
const YourModule = lazy(() => import('./modules/your-module/YourModule'));
// Add to switch statement
```

3. **Add Navigation**: `/apps/command-center-ui/src/config/navigation.ts`

---

## Testing Strategy

### Backend Testing
```bash
# Unit tests
pytest tests/unit -v

# Integration tests (requires API keys)
pytest tests/integration -v -m integration

# All tests
make test
```

### Frontend Testing
```bash
cd apps/command-center-ui
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:ui           # Visual UI
```

### Manual Testing Checklist
- [ ] All modules load without errors
- [ ] Real data appears in UI
- [ ] Agents show actual status
- [ ] No WebGL errors in console
- [ ] AIRA responds with OpenAI
- [ ] Shopify products load
- [ ] Orders sync properly
- [ ] Metrics update in real-time

---

## Monitoring & Operations

### Health Checks
- `/healthz` - Liveness (is service running?)
- `/readyz` - Readiness (are dependencies available?)
- `/metrics` - Prometheus metrics

### Logging
- **Level**: Set via `LOG_LEVEL` (DEBUG, INFO, WARN, ERROR)
- **Format**: Structured JSON in production
- **Location**: Console (dev) / Files (prod)

### Error Tracking
- **Sentry**: Configured via `SENTRY_DSN`
- **Backend**: Automatic error capture
- **Frontend**: React error boundaries

---

## Security

### Secret Management
**Location**: `/core/secrets/secret_provider.py`

**Cascade Order**:
1. Environment variables
2. GitHub Actions secrets
3. Cloudflare Workers bindings
4. AWS SSM
5. Encrypted cache

**Usage**:
```python
from core.secrets.secret_provider import UnifiedSecretResolver
secrets = UnifiedSecretResolver()
api_key = await secrets.get_secret('API_KEY_NAME')
```

### Authentication
- API endpoints use token-based auth
- Shopify uses OAuth 2.0
- OpenAI uses API keys
- Internal services use HMAC signatures

---

## Performance Optimization

### Backend
- Redis caching for frequently accessed data
- Connection pooling for databases
- Async operations for I/O
- Rate limiting on external APIs

### Frontend
- Lazy loading modules
- Code splitting
- Image optimization
- WebSocket for real-time updates (vs polling)

### Agents
- Exponential backoff for retries
- Circuit breakers for failing services
- Batch operations where possible
- Scheduled execution (avoid constant polling)

---

## Deployment

### Production Checklist
- [ ] All environment variables set
- [ ] Secrets configured properly
- [ ] Database migrations run
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Rate limits configured
- [ ] Backups configured

### CI/CD Pipeline
**Location**: `.github/workflows/`

**Stages**:
1. Lint and type check
2. Unit tests
3. Integration tests
4. Security scans
5. Build Docker image
6. Deploy to staging
7. Run smoke tests
8. Deploy to production

---

## Troubleshooting

### Common Issues

**"Agent not running"**
- Check orchestrator logs
- Verify agent registered in `init_autonomous_empire()`
- Check for import errors

**"Secret not found"**
- Verify environment variable set
- Check secret provider cascade
- Review logs for resolution errors

**"Health endpoint failing"**
- Check circuit breaker states
- Verify optional dependencies available
- Review dependency health in `/readyz`

**"WebGL error"**
- Check browser WebGL support
- Reduce number of Canvas instances
- Implement fallback UI

**"AIRA not responding"**
- Verify `OPENAI_API_KEY` set
- Check FastAPI service running (port 3000)
- Review OpenAI API quota/limits

---

## Best Practices

### Code Quality
- Use type hints in Python
- Use TypeScript strict mode
- Write tests for new features
- Document complex logic
- Follow existing patterns

### Git Workflow
- Feature branches from `develop`
- Conventional commits: `feat:`, `fix:`, `docs:`, etc.
- PR to `develop` (not `master`)
- Review before merge
- Squash commits when merging

### Documentation
- Update this file when adding features
- Keep API docs current
- Document breaking changes
- Add inline comments for complex code

---

## Quick Reference

### Key Commands
```bash
# Backend
make setup          # Install dependencies
make test           # Run tests
make lint           # Lint code
make ci             # Full CI pipeline
python wsgi.py      # Start Flask

# Frontend
cd apps/command-center-ui
pnpm install        # Install deps
pnpm dev            # Start dev server
pnpm build          # Production build
pnpm test           # Run tests

# Agents
python -m orchestrator.agents.product_research  # Test agent
```

### Important URLs
- **Development**: http://localhost:5173 (React) + http://localhost:10000 (Flask)
- **Production**: https://command.royalequips.nl
- **Health**: http://localhost:10000/healthz
- **Metrics**: http://localhost:10000/metrics
- **API Docs**: http://localhost:10000/docs

### Environment Variables
```bash
# Required
SECRET_KEY=<generated>
FLASK_ENV=production
SHOPIFY_ACCESS_TOKEN=<token>

# Optional but recommended
OPENAI_API_KEY=<key>
SENTRY_DSN=<dsn>
BIGQUERY_PROJECT_ID=<project>
REDIS_URL=redis://localhost:6379
```

---

## Next Steps for Development

### Immediate Priorities
1. Fix WebGL context error
2. Connect AIRA to OpenAI API
3. Remove all mock data
4. Verify all API integrations working
5. Update all module business logic

### Short Term (1-2 weeks)
1. Complete all module implementations
2. Add comprehensive error handling
3. Implement full test coverage
4. Performance optimization
5. Documentation updates

### Long Term (1-3 months)
1. Advanced analytics dashboard
2. Machine learning model integration
3. Multi-tenant support
4. Advanced automation workflows
5. Mobile app development

---

**Last Updated**: 2025-01-02
**Maintainer**: @Skidaw23
**Status**: Active Development - Production System
