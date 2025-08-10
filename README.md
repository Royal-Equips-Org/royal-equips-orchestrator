# Royal Equips Orchestrator

Royal Equips Orchestrator is an enterprise‑grade automation platform designed
for high‑growth e‑commerce businesses. It provides a modular, multi‑agent
system that automates every aspect of running a Shopify store in the
car‑tech and accessories niche, from trend discovery through dynamic
pricing to post‑purchase support. Inspired by research on agentic AI and
modern orchestration patterns, the orchestrator coordinates specialized
agents under a unified control plane and exposes a digital control
center for monitoring and intervention.

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

* **Digital Control Center** – A Streamlit dashboard visualizes
  trending keywords, demand forecasts, price adjustments, campaign
  history, support activity and agent health. It provides manual
  controls to run agents on demand.

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
   * `control-center` – Streamlit dashboard on `localhost:8501`.

4. **Run locally without Docker**:

   ```bash
   python3 -m venv venv
   . venv/bin/activate
   pip install --upgrade pip -r requirements.txt
   export $(grep -v '^#' .env | xargs)
   uvicorn royal_equips_orchestrator.scripts.run_orchestrator:app --reload
   ```

5. **Access the control center** (optional):

   ```bash
   streamlit run orchestrator/control_center/app.py
   ```

   Or use the provided helper script:
   
   ```bash
   python scripts/run_control_center.py
   ```

## Control Center (Streamlit)

The Streamlit Control Center provides a web-based dashboard for monitoring and controlling the orchestrator and its agents.

### Local Development

To run the Control Center locally:

```bash
# Direct streamlit command
streamlit run orchestrator/control_center/app.py

# Using helper script (recommended)
python scripts/run_control_center.py

# Using Make target
make dashboard
```

### Configuration

The Control Center can be configured using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `STREAMLIT_SERVER_PORT` | `8501` | Port for the Streamlit server |
| `STREAMLIT_SERVER_ADDRESS` | `localhost` | Address to bind the server to |
| `STREAMLIT_SERVER_HEADLESS` | `false` | Run in headless mode (no browser) |

### Render Deployment

For Render deployments, add the Control Center as a separate web service in your `render.yaml`:

```yaml
services:
  - type: web
    name: control-center
    env: docker
    dockerfilePath: ./Dockerfile
    plan: starter
    startCommand: streamlit run orchestrator/control_center/app.py --server.headless true --server.address 0.0.0.0 --server.port $PORT
    envVars:
      - key: STREAMLIT_SERVER_HEADLESS
        value: "true"
```

### Troubleshooting

If you encounter import errors:
- Ensure all `__init__.py` files are present in the orchestrator packages
- Verify you're running from the project root directory
- Check that dependencies are installed: `pip install -r requirements.txt`

## Environment Variables

The orchestrator relies on several environment variables. See
`.env.example` for a full list. The critical ones are:

| Variable            | Purpose                                            |
|--------------------|----------------------------------------------------|
| `SHOPIFY_API_KEY`   | API key for your custom Shopify app               |
| `SHOPIFY_API_SECRET`| API secret/password for your Shopify app          |
| `SHOP_NAME`         | Your store's subdomain (e.g. `my-shop`)           |
| `OPENAI_API_KEY`    | API key for OpenAI’s Chat API (support agent)     |
| `DATABASE_URL`      | Optional connection string for persistent storage |

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
