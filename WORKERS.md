# Cloudflare Workers Setup

This directory contains the Cloudflare Workers configuration for the Royal Equips Orchestrator project.

## Architecture

The Royal Equips Orchestrator is primarily a Python FastAPI application designed to run in containerized environments (like Render). However, this Cloudflare Workers setup provides:

1. **Proxy functionality** - Routes requests to the main Python API
2. **Health checks** - Provides immediate health status from the edge
3. **Fallback responses** - Basic responses when the main API is unavailable

## Files

- `wrangler.toml` - Cloudflare Workers configuration
- `src/index.js` - Workers entry point and proxy logic
- `package.json` - Node.js dependencies (for development)

## Deployment

The Workers deployment should automatically happen via Cloudflare's Git integration. The Workers will:

1. Serve health checks directly from the edge
2. Proxy API requests to the Python application deployed on Render
3. Provide fallback responses if the main API is unavailable

## Environment Variables

- `PYTHON_API_URL` - URL of the main Python FastAPI application (defaults to Render deployment)