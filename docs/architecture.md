# Architecture Documentation

## Royal Equips Orchestrator - Flask Architecture

### Overview

The Royal Equips Orchestrator has been migrated from FastAPI to Flask with Gunicorn for improved production stability and WSGI compatibility. This document outlines the architecture of the Flask-based system.

### System Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│                     │    │                      │    │                     │
│    Load Balancer    │    │    Flask App         │    │   External APIs     │
│    (Render/nginx)   │────│    (Gunicorn WSGI)   │────│   (Shopify/GitHub)  │
│                     │    │                      │    │                     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
                                        │
                                        │
                           ┌─────────────────────────┐
                           │                         │
                           │  Orchestrator Core      │
                           │  (Business Logic)       │
                           │                         │
                           └─────────────────────────┘
                                        │
                           ┌─────────────────────────┐
                           │                         │
                           │     Agent System        │
                           │   (AI/ML Components)    │
                           │                         │
                           └─────────────────────────┘
```

### Components

#### 1. Flask Application (`app/`)

**Structure:**
- `app/__init__.py` - Application factory with configuration
- `app/config.py` - Environment-based configuration management
- `app/routes/` - Modular blueprint-based routing
  - `main.py` - Root routes, command center, events, jobs
  - `health.py` - Health and readiness endpoints
  - `agents.py` - Agent session and messaging endpoints  
  - `metrics.py` - System metrics and monitoring
  - `errors.py` - Centralized error handling
- `app/services/` - Business logic services
  - `health_service.py` - Health monitoring with circuit breakers

#### 2. WSGI Entry Point (`wsgi.py`)

Production-ready WSGI application object for deployment with Gunicorn.

#### 3. Orchestrator Core (`orchestrator/`)

Preserved existing business logic:
- `core/orchestrator.py` - Central agent coordination
- `core/agent_base.py` - Base agent interface
- `core/health_monitor.py` - Health monitoring system
- `agents/` - Specific agent implementations
- `integrations/` - External service integrations
- `ai/` - AI/ML assistant components

### API Endpoints

#### Health & Monitoring
- `GET /healthz` - Liveness probe (plain text "ok")
- `GET /readyz` - Readiness probe with dependency checks
- `GET /health` - Legacy health endpoint for compatibility
- `GET /metrics` - System metrics (requests, errors, uptime, sessions)

#### Core Application
- `GET /` - Landing page with service information
- `GET /command-center` - Redirect to command center URL
- `GET /control-center` - Alias for command center
- `GET /dashboard` - Alias for command center
- `GET /docs` - API documentation
- `GET /favicon.ico` - Favicon handling

#### Agent System
- `POST /agents/session` - Create new agent session
- `POST /agents/message` - Send message to agent
- `GET /agents/stream?session_id=<id>` - Server-Sent Events streaming
- `GET /agents/sessions` - List active sessions
- `GET /agents/session/<id>/messages` - Get session messages

#### Background Operations
- `POST /events` - Accept event payloads for processing
- `GET /jobs` - List background jobs

### Configuration

Environment-based configuration with three profiles:
- **Development** - Debug enabled, local settings
- **Testing** - Test-specific configuration
- **Production** - Optimized for production deployment

Key configuration variables:
- `FLASK_ENV` - Environment (development/testing/production)
- `PORT` - Server port (default: 10000)
- `SECRET_KEY` - Flask secret key
- `COMMAND_CENTER_URL` - Command center redirect URL
- `ENABLE_METRICS` - Enable/disable metrics collection
- `ENABLE_STREAMING` - Enable/disable SSE streaming
- External API keys (Shopify, OpenAI, GitHub, BigQuery)

### Health Monitoring & Circuit Breakers

The health service implements circuit breaker patterns for external dependencies:

**Circuit States:**
- `CLOSED` - Normal operation
- `OPEN` - Dependency failing, requests blocked
- `HALF_OPEN` - Testing if dependency recovered

**Dependencies Monitored:**
- Shopify API (optional)
- BigQuery (optional)  
- GitHub API (optional)

**Fallback Behavior:**
- Optional dependencies don't fail readiness checks
- Circuit breakers prevent cascade failures
- Graceful degradation when services unavailable

### Logging & Error Handling

- Structured logging with configurable levels
- Health endpoint noise suppression
- Centralized error handling with JSON/HTML responses
- Request/response logging for debugging

### Security Features

- CORS configuration (configurable per environment)
- Input validation on all endpoints
- Rate limiting ready (TODO: implement)
- Secret management via environment variables

### Deployment

**Docker Deployment:**
- Multi-stage build with Python 3.11
- Gunicorn WSGI server (2 workers, sync worker class)
- Health check integration
- Port 10000 exposed

**Render Deployment:**
- Docker-based deployment
- Health check at `/healthz`
- Environment variable configuration
- Auto-scaling ready

### Migration from FastAPI

**Preserved Functionality:**
- All existing API endpoints maintained
- Agent session management
- Server-Sent Events streaming
- Metrics collection
- Health monitoring
- Command center integration

**Key Changes:**
- ASGI → WSGI (uvicorn → gunicorn)
- FastAPI → Flask
- Pydantic models → Flask request validation
- FastAPI middleware → Flask blueprints
- EventSourceResponse → Flask Response streaming

**Backward Compatibility:**
- Legacy `/health` endpoint maintained
- Same JSON response formats
- Identical agent session workflow
- Compatible with existing monitoring

### Performance Characteristics

**Flask + Gunicorn:**
- Synchronous request handling
- Worker process model
- Memory efficient
- Battle-tested in production
- Better error isolation

**Scalability:**
- Horizontal scaling via worker processes
- Stateless application design
- External session storage ready (Redis/DB)
- Load balancer friendly

### Monitoring & Observability

**Built-in Metrics:**
- Request count
- Error count  
- Active sessions
- Message count
- Uptime tracking
- Circuit breaker states

**Health Checks:**
- Liveness probe (service running)
- Readiness probe (dependencies healthy)
- Dependency-specific health checks
- Circuit breaker status

**Logging:**
- Structured logging format
- Configurable log levels
- Request/response correlation
- Error tracking and alerting ready