# Royal Equips Orchestrator

Royal Equips Orchestrator is an enterprise‑grade automation platform designed
for high‑growth e‑commerce businesses. It provides a modular, multi‑agent
system that automates every aspect of running a Shopify store in the
car‑tech and accessories niche, from trend discovery through dynamic
pricing to post‑purchase support. Inspired by research on agentic AI and
modern orchestration patterns, the orchestrator coordinates specialized
agents under a unified control plane and exposes a digital control
center for monitoring and intervention.

## 🚀 2050 Cyberpunk Command Center

The system features an **ultimate futuristic command center** built with React + TypeScript:

- **Cyberpunk Aesthetic**: Electric blue, neon orange, matrix green color palette
- **Holographic Visualizations**: Three.js powered 3D displays and interactive elements  
- **Real-time Monitoring**: Live agent status, system metrics, performance analytics
- **Voice Control**: AI-powered commands with OpenAI Whisper integration
- **Multi-Agent Communication**: Unified chat interface and command execution
- **Advanced Navigation**: Six-panel interface (Overview, Operations, Data, Commerce, Agents, Settings)

### Architecture

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
                  ▼ Proxy to PYTHON_API_URL
┌─────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                            │
│  WebSocket: Real-time data streams │ Agent communication     │
│  System: Health │ Metrics │ Jobs │ Events │ Voice Processing │
│  CORS: Configured for React origin                            │
└─────────────────────────────────────────────────────────────────┘
                  │
                  ▼
   ┌────────────────────────────────────────────┐
   │           Orchestrator (async)             │
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

2. **Install dependencies**

   ```bash
   # Python backend dependencies
   pip install -r requirements.txt
   
   # Cloudflare Worker dependencies
   npm install
   
   # React Command Center dependencies  
   cd admin && npm install && cd ..
   ```

3. **Environment configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your secrets:
   # - SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOP_NAME
   # - OPENAI_API_KEY (optional, for real AI responses)
   # - PYTHON_API_URL (for Worker proxy configuration)
   ```

4. **Development servers**

   ```bash
   # Terminal 1: Start enhanced backend
   python -m uvicorn api.main:app --reload --port 8000
   
   # Terminal 2: Start Cloudflare Worker (local)
   npx wrangler dev --local --port 8787
   
   # Terminal 3: Start React Command Center
   cd admin && npm run dev
   ```

5. **Access the interfaces**

   - **2050 Cyberpunk Command Center**: http://localhost:3000/admin/
   - **Worker Proxy Health**: http://localhost:8787/health
   - **Backend API**: http://localhost:8000/health

### Production Deployment

#### Cloudflare Worker Deployment

The Worker now supports explicit environment targeting to eliminate deployment warnings:

```bash
# Deploy to staging
npx wrangler deploy -e staging

# Deploy to production  
npx wrangler deploy -e production

# Check deployment status
npx wrangler deployments list
```

**Environment Variables per Environment:**

- **Staging**: `PYTHON_API_URL` points to staging backend
- **Production**: `PYTHON_API_URL` points to production backend

#### Backend Deployment

```bash
# Production deployment with enhanced backend
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000

# Or using Docker
docker compose up --build
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

* **API Service** – A FastAPI application exposes endpoints to check
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
   * `orchestrator` – FastAPI application on `localhost:8000`.
   * `control-center` – Holographic Control Center on `localhost:8501`.

4. **Run locally without Docker**:

   ```bash
   python3 -m venv venv
   . venv/bin/activate
   pip install --upgrade pip -r requirements.txt
   export $(grep -v '^#' .env | xargs)
   uvicorn royal_equips_orchestrator.scripts.run_orchestrator:app --reload
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
- **API Backend**: http://localhost:8000/health

## Accessing the Command Center

### Production Deployment via Render

When deployed using the `render.yaml` blueprint, the system provides a **single Holographic Control Center** powered by Streamlit:

1. **Deploy to Render** using the blueprint configuration in `render.yaml`
2. **Access the Command Center**: Navigate to Render Dashboard → Services → `control-center` → click the public URL
3. **Environment Variables**: The following variables are required and should be set as secrets in Render:
   - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOP_NAME` - Shopify integration
   - `OPENAI_API_KEY` - AI-powered features
   - `GITHUB_TOKEN` - GitHub status and operations
   - `BIGQUERY_*` variables - Analytics export (optional)

The system is pinned to use the **holographic variant** exclusively via the `CONTROL_CENTER_VARIANT=holographic` environment variable configured in the blueprint.

**Note**: The React admin interface (`admin/` directory) is not deployed by the Render blueprint and is intended for local development only.

## Environment Variables

The orchestrator relies on several environment variables. See
`.env.example` for a full list. The critical ones are:

| Variable            | Purpose                                            |
|--------------------|----------------------------------------------------|
| `SHOPIFY_API_KEY`   | API key for your custom Shopify app               |
| `SHOPIFY_API_SECRET`| API secret/password for your Shopify app          |
| `SHOP_NAME`         | Your store's subdomain (e.g. `my-shop`)           |
| `OPENAI_API_KEY`    | API key for OpenAI’s Chat API (support agent)     |
| `GITHUB_TOKEN`      | GitHub API token for holographic control center   |
| `CONTROL_CENTER_VARIANT` | Set to `holographic` (pinned in Render blueprint) |
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
