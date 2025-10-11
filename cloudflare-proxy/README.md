# Cloudflare Worker Proxy Configuration

This directory contains the Cloudflare Worker configuration for proxying all requests to the unified backend.

## Problem Solved

This proxy ensures that:
- UI and API are served from the same origin (eliminates CORS issues)
- Service worker cache issues are avoided by serving everything from one endpoint
- Users get the updated UI from the same host as the API

## Setup

1. Update `wrangler.toml` with your actual domain and backend URL:
   ```toml
   routes = [
     { pattern = "yourdomain.com/*", zone_name = "yourdomain.com" }
   ]
   
   [vars]
   UPSTREAM = "https://your-backend-url.render.com"
   ```

2. Deploy with:
   ```bash
   wrangler deploy
   ```

3. **Important**: Disable/remove any Cloudflare Pages deployments for the same domain to avoid conflicts.

## How It Works

1. All requests to your domain go to this Worker
2. Worker forwards everything to your backend (which serves both UI and API)
3. Backend returns either:
   - Static UI files (HTML, CSS, JS) for browser requests
   - API responses (JSON) for `/v1/*` requests
4. Worker passes the response back unchanged

## Alternative: Direct DNS

Instead of using this proxy, you can also:
1. Point your domain's DNS directly to your backend
2. Remove any Cloudflare Pages routes
3. Let your backend handle everything directly

Choose the approach that fits your infrastructure best.