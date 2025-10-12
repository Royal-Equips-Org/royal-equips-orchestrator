# RoyalGPT API Routing Fix - Deployment Guide

## Problem Summary
RoyalGPT calls to `command.royalequips.nl/api/v2/products` and `/api/intelligence/report` were returning HTML (Command Center UI) instead of JSON data from the Flask backend.

## Root Cause
1. `command.royalequips.nl` domain was pointing to Cloudflare Pages (React UI)
2. The `_redirects` file had a catch-all that served the SPA for ALL requests including `/api/*`
3. No Cloudflare Worker routes were configured for `command.royalequips.nl` to proxy to Flask backend

## Changes Made

### 1. Command Center UI `_redirects` File
**File:** `apps/command-center-ui/public/_redirects`

Added proxy rules BEFORE the SPA fallback to route API requests to Flask backend:
```
/api/*  https://royal-equips-orchestrator.onrender.com/api/:splat  200
/health  https://royal-equips-orchestrator.onrender.com/health  200
/healthz  https://royal-equips-orchestrator.onrender.com/healthz  200
/readyz  https://royal-equips-orchestrator.onrender.com/readyz  200
/metrics  https://royal-equips-orchestrator.onrender.com/metrics  200
```

### 2. Command Center UI `_headers` File
**File:** `apps/command-center-ui/public/_headers` (NEW)

Added security headers for API endpoints and proper caching for static assets.

### 3. Cloudflare Worker Configuration
**File:** `workers/wrangler.toml`

Added route configuration for `command.royalequips.nl`:
```toml
routes = [
  { pattern = "command.royalequips.nl/*", zone_name = "royalequips.nl" }
]
```

Set upstream to Flask backend on Render:
```toml
UPSTREAM_API_BASE = "https://royal-equips-orchestrator.onrender.com"
```

### 4. Cloudflare Proxy Configuration
**File:** `cloudflare-proxy/wrangler.toml`

Extended routes to support both `.com` and `.nl` domains:
```toml
routes = [
  { pattern = "royalequips.com/*", zone_name = "royalequips.com" },
  { pattern = "*.royalequips.com/*", zone_name = "royalequips.com" },
  { pattern = "royalequips.nl/*", zone_name = "royalequips.nl" },
  { pattern = "*.royalequips.nl/*", zone_name = "royalequips.nl" }
]
```

## Deployment Steps

### Option 1: Deploy via Cloudflare Pages (Recommended)
1. **Rebuild and deploy Command Center UI**:
   ```bash
   cd apps/command-center-ui
   pnpm install
   pnpm run build
   ```

2. **Deploy to Cloudflare Pages**:
   - The updated `_redirects` and `_headers` files in `public/` will be included in the build
   - Deploy via Cloudflare Pages dashboard or GitHub integration
   - The `_redirects` rules will automatically proxy `/api/*` to the Flask backend

3. **Verify deployment**:
   ```bash
   # Test API endpoint - should return JSON
   curl -H "Accept: application/json" https://command.royalequips.nl/api/v2/products?limit=10

   # Should return JSON with product data, NOT HTML
   ```

### Option 2: Deploy Cloudflare Worker
1. **Deploy the worker** (requires Wrangler CLI and Cloudflare credentials):
   ```bash
   cd workers
   pnpm install -g wrangler
   wrangler login
   wrangler deploy -e production
   ```

2. **Verify worker is active**:
   - Check Cloudflare dashboard → Workers & Pages
   - Verify `royal-equips-orchestrator` worker has route for `command.royalequips.nl/*`

### Option 3: Both (Maximum Reliability)
Deploy both Cloudflare Pages (with `_redirects`) AND the Cloudflare Worker. The Worker will take precedence for routing, with `_redirects` as a fallback.

## Testing Checklist

After deployment, test the following endpoints:

### ✅ RoyalGPT API Endpoints
```bash
# 1. List Products V2
curl -H "Accept: application/json" \
  "https://command.royalequips.nl/api/v2/products?limit=10"
# Expected: JSON with product array, NOT HTML

# 2. Intelligence Report
curl -H "Accept: application/json" \
  "https://command.royalequips.nl/api/intelligence/report?timeframe=7d"
# Expected: JSON with intelligence report, NOT HTML

# 3. Agents Status
curl -H "Accept: application/json" \
  "https://command.royalequips.nl/api/agents/status"
# Expected: JSON with agent status array, NOT HTML

# 4. Agent Health
curl -H "Accept: application/json" \
  "https://command.royalequips.nl/api/agents/product_research/health"
# Expected: JSON with agent health details, NOT HTML
```

### ✅ Health Endpoints
```bash
# Liveness
curl https://command.royalequips.nl/healthz
# Expected: "ok" or JSON {"status": "healthy"}

# Readiness
curl https://command.royalequips.nl/readyz
# Expected: JSON with readiness checks

# Health
curl https://command.royalequips.nl/health
# Expected: JSON with comprehensive health data
```

### ✅ SPA Routes (should still work)
```bash
# Home page - should return HTML
curl https://command.royalequips.nl/
# Expected: HTML with "ROYAL EQUIPS EMPIRE COMMAND CENTER"

# Dashboard route - should return HTML (SPA handles routing)
curl https://command.royalequips.nl/dashboard
# Expected: HTML (same as home, client-side routing)
```

## Verification

To verify the fix is working:

1. **Check Response Content-Type**:
   ```bash
   curl -I "https://command.royalequips.nl/api/v2/products?limit=10"
   # Should see: Content-Type: application/json
   # Should NOT see: Content-Type: text/html
   ```

2. **Check Response Body**:
   ```bash
   curl "https://command.royalequips.nl/api/v2/products?limit=10" | head -5
   # Should start with: {"items":[...
   # Should NOT start with: <!doctype html>
   ```

3. **Check with RoyalGPT**:
   - Have RoyalGPT call the `listProductsV2` operation again
   - Should receive JSON data, not HTML
   - Should see actual product data from Shopify or fallback data

## Rollback Procedure

If issues occur after deployment:

### Rollback Cloudflare Pages
1. Go to Cloudflare Dashboard → Pages → command-center
2. Select "Deployments" tab
3. Find previous working deployment
4. Click "Rollback to this deployment"

### Rollback Cloudflare Worker
```bash
cd workers
git checkout HEAD~1 wrangler.toml
wrangler deploy -e production
```

### Rollback `_redirects`
```bash
cd apps/command-center-ui/public
echo "/*  /index.html  200" > _redirects
git add _redirects
git commit -m "rollback: Restore original _redirects"
git push
```

## Architecture Notes

### Request Flow After Fix
```
RoyalGPT → command.royalequips.nl/api/v2/products
    ↓
Cloudflare (DNS)
    ↓
Cloudflare Pages (with _redirects) OR Cloudflare Worker
    ↓
_redirects rule: /api/* → https://royal-equips-orchestrator.onrender.com/api/*
    ↓
Flask Backend (Render)
    ↓
RoyalGPT API endpoint: /api/v2/products
    ↓
Shopify Service (real data) or Fallback (production-ready data)
    ↓
JSON Response → RoyalGPT
```

### Key Files
- **Flask Backend**: `app/routes/royalgpt_api.py` - RoyalGPT API implementations
- **Cloudflare Pages**: `apps/command-center-ui/public/_redirects` - Proxy rules
- **Cloudflare Worker**: `workers/wrangler.toml` - Route configuration
- **Worker Code**: `src/index.js` - Hono-based proxy implementation

## Support

If API endpoints still return HTML after deployment:

1. **Check DNS**: Verify `command.royalequips.nl` resolves correctly
   ```bash
   nslookup command.royalequips.nl
   ```

2. **Check Cloudflare Routing**: Verify in Cloudflare Dashboard that either:
   - Pages deployment has latest `_redirects` file, OR
   - Worker is deployed with route for `command.royalequips.nl/*`

3. **Check Backend**: Verify Flask backend is running on Render
   ```bash
   curl https://royal-equips-orchestrator.onrender.com/healthz
   # Should return: ok
   ```

4. **Check Logs**:
   - Cloudflare Pages: Dashboard → Pages → command-center → Functions
   - Cloudflare Worker: Dashboard → Workers & Pages → royal-equips-orchestrator → Logs
   - Render Backend: Dashboard → royal-equips-orchestrator → Logs

## Related Documentation
- OpenAPI Spec: `docs/openapi/royalgpt-command-api.yaml`
- Stack Report: `reports/STACK_REPORT.md`
- Health Endpoints: `HEALTH_ENDPOINTS_FIX_SUMMARY.md`
- Architecture: `docs/architecture.md`
