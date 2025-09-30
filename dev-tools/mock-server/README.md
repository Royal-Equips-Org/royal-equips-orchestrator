# Royal Equips Mock API Server

This is a development mock server that provides API endpoints for testing the Command Center UI.

## Usage

### Install dependencies
```bash
cd dev-tools/mock-server
npm install
```

### Start the server
```bash
npm start
```

The server will run on http://localhost:10000

## Configuration

The Command Center UI automatically detects whether it's running in development or production:

- **Development** (localhost:3000, localhost:5173, etc.): Uses `http://localhost:10000` or development config from config.json
- **Production** (Cloudflare Pages, custom domains): Uses relative paths like `/api`

### For Local Development with Mock Server

1. Start the mock server: `cd dev-tools/mock-server && npm start`
2. Start the UI: `cd apps/command-center-ui && pnpm dev`
3. The UI will automatically connect to `http://localhost:10000`

### For Local Development with Real Backend

1. Start the Flask orchestrator: `python wsgi.py`
2. Start the UI: `cd apps/command-center-ui && pnpm dev`
3. Copy `config.local.json` to `config.json` if you want to force localhost:10000

## Available Endpoints

- **Health**: `/healthz`, `/readyz`
- **Agents**: `/agents`, `/agents/status`
- **Empire**: `/empire/metrics`
- **AIRA**: `/aira/status`, `/aira/operations`
- **Revenue**: `/revenue/metrics`
- **Analytics**: `/analytics/overview`
- **Marketing**: `/marketing/campaigns`
- **Security**: `/security/threats`
- **Finance**: `/finance/overview`
- **Inventory**: `/inventory/overview`

## Environment Detection

The runtime configuration system automatically detects the environment:

- **Development indicators**: localhost, ports 3000/5173/8080/4000, Vite dev server
- **Production**: All other environments (Cloudflare Pages, custom domains)

This ensures the correct API endpoints are used without manual configuration changes.