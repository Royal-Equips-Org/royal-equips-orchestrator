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

## Development

This server is only intended for development use and provides mock data for testing the Command Center UI when the real Flask orchestrator is not available.