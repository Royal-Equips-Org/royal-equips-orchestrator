# Royal Equips Orchestrator

Royal Equips Orchestrator is an enterprise‑grade automation platform designed
for high‑growth e‑commerce businesses. It provides a modular, multi‑agent
system that automates every aspect of running a Shopify store in the
car‑tech and accessories niche, from trend discovery through dynamic
pricing to post‑purchase support.

**Version 2.0** - Now powered by **Flask + Gunicorn** for enhanced production reliability and WSGI compatibility.

## 🚀 2050 Cyberpunk Command Center

The system features an **ultimate futuristic command center** built with React + TypeScript:

- **Cyberpunk Aesthetic**: Electric blue, neon orange, matrix green color palette
- **Holographic Visualizations**: Three.js powered 3D displays and interactive elements  
- **Real-time Monitoring**: Live agent status, system metrics, performance analytics
- **Voice Control**: AI-powered commands with OpenAI Whisper integration
- **Multi-Agent Communication**: Unified chat interface and command execution
- **Advanced Navigation**: Six-panel interface (Overview, Operations, Data, Commerce, Agents, Settings)

## 🏗️ Royal EQ MCP Server

This repository includes a comprehensive **Model Context Protocol (MCP) server** that enables:

- **Multi-Platform Integration**: Shopify GraphQL, BigQuery, Supabase, Git repositories, and orchestrator APIs
- **Enterprise Security**: HMAC authentication, circuit breakers, rate limiting
- **Self-Healing Architecture**: Auto-retry, connection pooling, graceful degradation  
- **Comprehensive Testing**: Unit tests, integration tests, contract compliance
- **Production Ready**: Logging, metrics, health checks, and monitoring

### MCP Server Quick Start

```bash
# Install MCP server dependencies
pip install -r requirements.txt

# Set up environment variables
export SHOPIFY_GRAPHQL_ENDPOINT="https://your-shop.myshopify.com/admin/api/2024-01/graphql.json"
export SHOPIFY_GRAPHQL_TOKEN="your-shopify-token"
export BIGQUERY_PROJECT_ID="your-bigquery-project"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-supabase-key"
export ORCHESTRATOR_BASE_URL="http://localhost:5000"
export ORCHESTRATOR_HMAC_KEY="your-hmac-key"
export REPO_ROOT="/path/to/your/repo"

# Run the MCP server
python -m royal_mcp
```

### Updated Architecture (v2.0)

```
┌─────────────────────────────────────────────────────────────────┐
│                    2050 CYBERPUNK COMMAND CENTER               │
│  React + TypeScript + Three.js + D3.js + Framer Motion       │
│  Pages: Overview │ Operations │ Data │ Commerce │ Agents      │
│  Features: Voice Control │ Real-time WebSocket │ 3D Holo     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKER PROXY                     │
│  Routes: /health │ /api/* (proxy) │ /admin/* (SPA)           │
│  Hono Framework  │  Environment-aware deployment             │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼ Proxy to FLASK_API_URL
┌─────────────────────────────────────────────────────────────────┐
│                     FLASK BACKEND (NEW!)                      │
│  WSGI: Gunicorn production server │ Circuit breakers         │
│  Health: /healthz, /readyz │ Metrics │ Events │ Agent APIs   │
│  Features: SSE Streaming │ Fallback patterns │ Monitoring    │
└─────────────────────────────────────────────────────────────────┘
                  │
                  ▼
   ┌────────────────────────────────────────────┐
   │           Orchestrator (preserved)         │
   │  • registers agents & schedules runs       │
   │  • exposes health information              │
   │  • monitors agents and restarts on failure│
   └────────────────────────────────────────────┘
          ▲               ▲            ▲
          │               │            │
┌───────────────────────┐  │  ┌─────────────────────────┐
│ Product Research     │  │  │ Inventory Forecasting  │
│ (news scraping)      │  │  │ (Prophet + Shopify)    │
└───────────────────────┘  │  └─────────────────────────┘
          │               │            │
          │               │            │
          ▼               ▼            ▼
┌───────────────────────┐     ┌─────────────────────────┐
│ Pricing Optimizer     │     │ Marketing Automation    │
│ (competitor scrape)   │     │ (email campaigns)       │
└───────────────────────┘     └─────────────────────────┘
          │                        │
          ▼                        ▼
┌───────────────────────┐     ┌──────────────────────────┐
│ Customer Support      │     │ Order Management         │
│ (OpenAI Chat)         │     │ (fulfilment, returns)     │
└───────────────────────┘     └──────────────────────────┘
```

## Quick Start

### Development Setup

1. **Clone the repository**

   ```bash
   git clone git@github.com:Skidaw23/royal-equips-orchestrator.git
   cd royal-equips-orchestrator
   ```

2. **Setup development environment**

   ```bash
   # Using the enhanced Makefile
   make setup
   
   # Or manually:
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install -e ".[dev]"  # Install with dev dependencies
   ```

3. **Environment configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run quality checks** 

   ```bash
   # Run the complete CI pipeline locally
   make ci
   
   # Or individual commands:
   make format     # Format code with black and ruff
   make lint       # Run ruff linting
   make typecheck  # Run mypy type checking
   make test       # Run pytest tests
   make coverage   # Run tests with coverage
   make scan       # Run security scans (bandit, vulture)
   ```

5. **Run the applications**

   ```bash
   # Start Flask backend server
   make run
   
   # Start Holographic Control Center
   make dashboard
   
   # Start Cloudflare Worker (local)
   npx wrangler dev --local --port 8787
   ```

### MCP Server Development

The Royal EQ MCP server provides enterprise-grade connectors for multiple platforms:

```bash
# Test the MCP server
python -m pytest tests/mcp/ -v

# Run a specific connector test
python -m pytest tests/mcp/test_shopify_connector.py -v

# Test with coverage
make coverage

# Run integration tests
python -m pytest tests/mcp/test_integration.py -m integration -v
```

### Pre-commit Hooks

Set up pre-commit hooks to ensure code quality:

```bash
pip install pre-commit
pre-commit install
```

This will run the following checks on every commit:
- Code formatting (black, ruff)
- Type checking (mypy)  
- Security scanning (bandit)
- Basic test validation

## Production Deployment
   cd admin && npm run dev
   ```

5. **Access the interfaces**

   - **2050 Cyberpunk Command Center**: http://localhost:3000/admin/
   - **Worker Proxy Health**: http://localhost:8787/health
   - **Flask Backend API**: http://localhost:10000/healthz
   - **Flask API Docs**: http://localhost:10000/docs

### Production Deployment

#### Flask Backend Deployment

The Flask application is designed for production deployment with Gunicorn:

```bash
# Production deployment with Gunicorn WSGI server
gunicorn --bind 0.0.0.0:10000 --workers 2 --worker-class sync wsgi:app

# Or using Docker (recommended)
docker build -t royal-equips-orchestrator .
docker run -p 10000:10000 -e FLASK_ENV=production royal-equips-orchestrator

# Or using docker-compose
docker compose up --build
```

#### Health Check Endpoints

The Flask application provides comprehensive health monitoring:

- `GET /healthz` - Lightweight liveness probe (returns "ok")
- `GET /readyz` - Comprehensive readiness check with dependency verification  
- `GET /health` - Legacy endpoint for backward compatibility
- `GET /metrics` - System metrics (requests, errors, uptime, sessions)

#### Render Deployment

Updated render.yaml configuration for Flask:

```bash
# Deploy to Render (automatically triggered via GitHub)
git push origin main

# Manual deployment trigger
curl -X POST https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys \
  -H "Authorization: Bearer $RENDER_API_KEY"
```

**Environment Variables for Render:**
- `FLASK_ENV=production`
- `PORT=10000` 
- External API keys (Shopify, OpenAI, GitHub, BigQuery)
- Feature flags (ENABLE_METRICS, ENABLE_STREAMING)

#### Cloudflare Worker Deployment

The Worker proxy configuration remains the same but now points to Flask backend:

```bash
# Deploy to staging
npx wrangler deploy -e staging

# Deploy to production  
npx wrangler deploy -e production

# Update Worker environment to point to Flask backend
npx wrangler secret put PYTHON_API_URL -e production
# Enter: https://your-flask-backend.onrender.com
```

#### Command Center Build & Deployment

```bash
cd admin

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy static assets to CDN/hosting platform
# Built files are in admin/dist/ directory
```

## Why AI Agents?

Traditional automation scripts are brittle and require constant human
supervision. Agentic AI operates autonomously: it learns from data,
perceives its environment and takes context‑aware actions without
continuous prompts【296456843594602†L371-L375】. By forecasting demand to prevent
stock‑outs, analyzing customer behavior and competitor pricing, and
adjusting prices in real time【296456843594602†L371-L375】, AI agents can dramatically
improve cash flow and agility. Multi‑agent orchestration makes it
possible to coordinate specialized agents across disparate systems and
legacy APIs, something traditional integrations struggle with【571575397346020†L49-L75】.

## Features

* **Modular Multi‑Agent Architecture** – The orchestrator manages
  agents for product research, demand forecasting, pricing optimization,
  marketing automation, customer support and order management. Each
  agent encapsulates domain‑specific logic and runs on its own schedule.

* **Self‑Healing & Fault Tolerance** – A health monitor periodically
  checks agent status and restarts tasks on failure. Loosely coupled
  agents make the system fault‑tolerant and extensible【571575397346020†L109-L117】.

* **Demand Forecasting** – Integrates with Shopify via GraphQL to
  retrieve historical order data and uses Prophet to predict future
  sales. Accurate forecasting helps prevent stock‑outs and excess
  inventory【296456843594602†L371-L375】.

* **Dynamic Pricing** – Scrapes competitor prices and updates
  Shopify product variants via GraphQL mutations. Pricing strategies
  adjust margins automatically to stay competitive while protecting
  profitability.

* **Marketing Automation** – Generates email campaigns based on
  trending products and inventory insights. Supports Shopify Email or
  custom SMTP providers.

* **AI‑Powered Customer Support** – Handles support tickets using
  OpenAI’s Chat API. Produces context‑aware responses that reduce
  response times and scale support without additional headcount.

* **Order Management & Fulfilment** – Monitors unfulfilled orders,
  captures payments, triggers fulfilment and handles returns via
  Shopify’s REST API.

* **Digital Command Center** – A React-powered cyberpunk interface
  that provides real-time visualization of agent status, system metrics,
  trending keywords, demand forecasts, price adjustments, campaign
  history, support activity and order processing. Features voice control,
  3D holographic displays, and manual agent execution controls.

* **API Service** – A Flask application exposes endpoints to check
  health or trigger agents, enabling integration with other systems or
  automation pipelines.

* **Containerized Deployment** – A production‑ready `Dockerfile` and
  `docker‑compose.yml` simplify local development, testing and cloud
  deployments. Environment variables are managed via `.env` files.

## Architecture

```
┌───────────────────────┐     ┌─────────────────────────┐
│  Product Research     │──┐  │  Inventory Forecasting  │
│  (news scraping)      │  │  │  (Prophet + Shopify)    │
└───────────────────────┘  │  └─────────────────────────┘
          │               │            │
          │               │            │
          ▼               ▼            ▼
   ┌────────────────────────────────────────────┐
   │           Orchestrator (async)             │
   │  • registers agents & schedules runs       │
   │  • exposes health information              │
   │  • monitors agents and restarts on failure│
   └────────────────────────────────────────────┘
          ▲               ▲            ▲
          │               │            │
┌───────────────────────┐  │  ┌─────────────────────────┐
│ Pricing Optimizer     │──┘  │ Marketing Automation    │
│ (competitor scrape)   │     │ (email campaigns)       │
└───────────────────────┘     └─────────────────────────┘
          │                        │
          ▼                        ▼
┌───────────────────────┐     ┌──────────────────────────┐
│ Customer Support      │     │ Order Management         │
│ (OpenAI Chat)         │     │ (fulfilment, returns)     │
└───────────────────────┘     └──────────────────────────┘
          │                        │
          └──────────► Control Center ◄──────────────┘
```

## Quick Start

1. **Clone the repository**

   ```bash
   git clone git@github.com:Skidaw23/royal-equips-orchestrator.git
   cd royal-equips-orchestrator
   ```

2. **Create a `.env` file** by copying `.env.example` and filling
   in your secrets:

   ```bash
   cp .env.example .env
   # edit .env with your Shopify and OpenAI credentials
   ```

3. **Run with Docker Compose** (recommended for production/testing):

   ```bash
   docker compose up --build
   ```

   This will start two services:
   * `orchestrator` – Flask application on `localhost:10000`.
   * `control-center` – Holographic Control Center on `localhost:8501`.

4. **Run locally without Docker**:

   ```bash
   python3 -m venv venv
   . venv/bin/activate
   pip install --upgrade pip -r requirements.txt
   export $(grep -v '^#' .env | xargs)
   python wsgi.py
   ```

5. **Access the command center**:

   ```bash
   # Access the React Command Center
   cd admin && npm run dev
   # Then visit: http://localhost:3000/admin/
   ```

## Docker Deployment

Launch the complete system with Docker:

```bash
# Launch orchestrator backend and React command center
docker compose up --build
```

Access points:
- **Command Center**: http://localhost:3000/admin/
- **API Backend**: http://localhost:10000/healthz

## Accessing the Command Center

### Production Deployment via Render

When deployed using the `render.yaml` blueprint, the system provides:

1. **orchestrator-api**: Docker-based Flask service
2. **control-center**: Python runtime service (uses Flask with minimal deps)

**Deployment Process**:
1. **Deploy to Render** using the blueprint configuration in `render.yaml`
2. **Access the API**: Navigate to Render Dashboard → Services → `control-center` → click the public URL
3. **Environment Variables**: The following variables are configured in the blueprint:
   - `APP_TYPE=flask` - Specifies Flask mode
   - `APP_PATH=wsgi:app` - Specifies the app entry point
   - Service-specific secrets: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOP_NAME`, `OPENAI_API_KEY`, etc.

**Important**: The `control-center` service uses `requirements-minimal.txt` to ensure fast builds and reliable deployment on Render's Python runtime.

## Environment Variables

The orchestrator relies on several environment variables. See
`.env.example` for a full list. The critical ones are:

| Variable            | Purpose                                            |
|--------------------|----------------------------------------------------|
| `APP_TYPE`         | Application type (`flask`, `fastapi`, `streamlit`, `auto`)  |
| `APP_PATH`         | Application entry point (e.g. `wsgi:app`)     |
| `SHOPIFY_API_KEY`   | API key for your custom Shopify app               |
| `SHOPIFY_API_SECRET`| API secret/password for your Shopify app          |
| `SHOP_NAME`         | Your store's subdomain (e.g. `my-shop`)           |
| `OPENAI_API_KEY`    | API key for OpenAI’s Chat API (support agent)     |
| `GITHUB_TOKEN`      | GitHub API token for operations                   |
| `DATABASE_URL`      | Optional connection string for persistent storage |

### Command Center Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API endpoint for React app |
| `VITE_WEBSOCKET_URL` | `ws://localhost:8000/ws` | WebSocket endpoint for real-time features |

## Logging and Health Checks

The orchestrator includes intelligent log filtering to reduce noise from
health check probes and other routine requests, especially important when
deployed on platforms like Render that frequently hit health endpoints.

### Health Check Logging Behavior

By default, Render's health checks continuously hit `/health`, which can
quickly fill logs with repetitive "GET /health 200 OK" entries. The
orchestrator automatically suppresses these access log entries while
preserving error logs and normal traffic logs.

### Environment Variables for Logging Control

| Variable               | Default | Purpose                                          |
|------------------------|---------|--------------------------------------------------|
| `SUPPRESS_HEALTH_LOGS` | `true`  | When `true`, suppresses access logs for `/health`, `HEAD /`, and `/favicon.ico` requests |
| `DISABLE_ACCESS_LOG`   | `false` | When `true`, completely disables uvicorn access logging |
| `LOG_LEVEL`            | `info`  | Sets log level for uvicorn (`debug`, `info`, `warning`, `error`, `critical`) |

### Minimal Noise-Reduction Routes

To prevent common 404 errors that add noise to logs, the orchestrator provides:

- **GET /** - Returns basic service status: `{"service": "orchestrator", "status": "ok", "version": "..."}`
- **GET|HEAD /favicon.ico** - Returns 204 No Content to prevent browser favicon requests from generating 404s

These routes are provided purely to reduce log noise and are not intended
as application features. The main health check endpoint remains `/health`.

### Deployment Considerations

The log filtering system works automatically with Render's deployment pattern
using import strings (e.g., `scripts.run_orchestrator:app`). The filters are
installed at module import time, so no changes to startup commands are needed.

Error logs from uvicorn are never suppressed, ensuring that real issues
remain visible in your monitoring systems.

## Scaling & Evolution

The orchestrator is designed to scale horizontally. Agents are
loosely coupled and can be distributed across multiple workers with
async message queues like RabbitMQ or Redis. New agents can be added
simply by subclassing `AgentBase` and registering them in the
orchestrator. Future work could include auto‑evolution strategies such
as periodically retraining models on new data, or dynamically
discovering and incorporating new market signals.

## Security & Privacy

Do **not** commit your `.env` file or any secrets to version control.
All credentials should be supplied via environment variables or secret
stores. The orchestrator uses HTTPS when communicating with Shopify
and OpenAI. Additional layers such as request signing, audit logging,
and rate limiting can be added depending on deployment requirements.

### Continuous Security

Security is treated as a first‑class citizen in this repository. In addition
to coding best practices and dependency management, the project includes
automated security scans:

* **Runtime security job** – The `render.yaml` blueprint defines a
  `security-scan` cron job that executes `scripts/run_security_checks.py`
  every day at 02:00 UTC. The script dynamically installs the latest
  versions of the static analysis tool Bandit and the dependency
  vulnerability scanner pip‑audit, runs them against the source code and
  `requirements.txt`, and emits a consolidated JSON report. Non‑zero exit
  codes signal potential security issues.
* **Security report** – Scan results are written to `security_report.json`
  and printed to the Render log stream. This enables continuous
  monitoring and allows you to configure alerts via Render’s log
  subscriptions.
* **Environment isolation** – The security tools are only installed
  in the short‑lived container that executes the scan. They are not part
  of the runtime image used by the web services.

Remember to review the security reports and address findings promptly.

## License

This project is provided under the MIT License. See `LICENSE` for
details.
