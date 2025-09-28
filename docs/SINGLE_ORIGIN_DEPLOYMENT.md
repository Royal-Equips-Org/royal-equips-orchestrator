# Single Origin Deployment Guide

This guide covers the migration from a multi-origin setup (Cloudflare Pages + separate API) to a unified single-origin architecture where the backend serves both UI and API.

## 🎯 Objectives

- Eliminate CORS issues by serving UI and API from same origin
- Prevent service worker cache conflicts
- Improve performance and reduce complexity
- Enable proper cache invalidation strategies

## 🏗️ Architecture Overview

**Before (Multi-origin):**
```
Browser → Cloudflare Pages (UI) → Backend API (CORS required)
        → Service Worker Cache → Stale Assets
```

**After (Single-origin):**
```
Browser → Backend Server → Serves UI + API (same origin)
        → No CORS required
        → Proper cache control
```

## 📋 Pre-deployment Checklist

- [ ] Backend serves static files from `dist-web` directory
- [ ] UI configuration uses relative API paths (`/v1` instead of absolute URLs)
- [ ] Service worker unregistration implemented
- [ ] Cache headers configured (`no-store` for HTML, long-term for assets)
- [ ] Health endpoints responding (`/v1/healthz`, `/v1/readyz`)
- [ ] Circuit breaker reset endpoint available
- [ ] CI/CD smoke tests configured

## 🚀 Deployment Steps

### 1. DNS Configuration

Choose one of these approaches:

#### Option A: Direct DNS (Recommended)
1. Update A/AAAA records for `command.royalequips.nl` to point directly to your backend load balancer
2. Remove/disable any Cloudflare Pages routes for this domain
3. Ensure SSL/TLS certificates are configured on your backend

#### Option B: Cloudflare Worker Proxy
1. Deploy the provided Cloudflare Worker (`/cloudflare-proxy/worker.js`)
2. Configure `wrangler.toml` with your backend URL
3. Set route pattern for `command.royalequips.nl/*`
4. Disable Pages routes for this domain

### 2. Backend Deployment

1. Build and deploy the unified container:
   ```bash
   docker build -f apps/api/Dockerfile -t royal-equips-api .
   docker run -p 10000:10000 -e NODE_ENV=production royal-equips-api
   ```

2. Verify deployment:
   ```bash
   curl -fsS http://your-backend/version | jq .
   curl -fsS http://your-backend/v1/healthz | jq .
   curl -fsS http://your-backend/v1/readyz | jq .
   ```

### 3. Frontend Cache Invalidation

The UI automatically:
- Unregisters all service workers on load
- Clears all browser caches
- Uses relative API paths for same-origin requests

### 4. Post-deployment Validation

Run the automated smoke tests:
```bash
# GitHub Actions
gh workflow run single-origin-smoke.yml -f target_url=https://command.royalequips.nl

# Manual validation
curl -fsS https://command.royalequips.nl/ | grep -q "ROYAL EQUIPS EMPIRE COMMAND CENTER"
curl -fsS https://command.royalequips.nl/version | jq -e '.release'
curl -fsS https://command.royalequips.nl/v1/readyz | jq -e '.'
```

## 🔧 Configuration Files

### UI Configuration (`/public/config.json`)
```json
{
  "apiRelativeBase": "/v1",
  "circuitBreaker": {
    "resetEndpoint": "/v1/admin/circuit/reset"
  }
}
```

### Cache Headers (automatic)
- HTML files: `Cache-Control: no-store`
- Static assets: `Cache-Control: public, max-age=31536000, immutable`

## 🚨 Troubleshooting

### Issue: UI not loading
- Check if `dist-web` directory exists in container
- Verify NODE_ENV=production for correct asset path
- Check server logs for static file serving errors

### Issue: API calls failing
- Confirm API paths use `/v1` prefix
- Verify CORS not blocking requests (shouldn't happen with same-origin)
- Check network tab for 404s on API endpoints

### Issue: Stale cache
- Service worker should auto-unregister, but force refresh if needed
- Check browser DevTools → Application → Storage → Clear storage

### Issue: Health checks failing
- Verify `/v1/healthz` returns 200 OK
- Check `/v1/readyz` for dependency status
- Review container health check configuration

## 🔄 Rollback Plan

If issues arise after deployment:

1. **Immediate rollback** (Option A - Direct DNS):
   - Switch DNS back to previous configuration
   - TTL should be low (300s recommended)

2. **Gradual rollback** (Option B - Worker Proxy):
   - Update worker to route percentage of traffic back to Pages
   - Gradually reduce backend traffic until issues resolved

3. **Container rollback**:
   - Keep previous container version in registry
   - Deploy previous version with same configuration

## 📊 Monitoring

Key metrics to monitor post-deployment:

- **Response times**: P95 < 1500ms for API calls
- **Error rate**: < 1% for critical endpoints
- **Cache hit ratio**: > 90% for static assets
- **Health check success**: > 99.9%

## 🎉 Success Criteria

- [ ] Homepage loads with correct title
- [ ] All API endpoints accessible via relative paths
- [ ] No CORS errors in browser console
- [ ] Cache headers working correctly
- [ ] Health checks passing
- [ ] Circuit breaker reset functional
- [ ] Performance within acceptable range (<5s initial load)

## 📚 Additional Resources

- [Cloudflare Worker Proxy README](../cloudflare-proxy/README.md)
- [Health Check Implementation](../apps/api/src/v1/health.ts)
- [Circuit Breaker Documentation](../apps/command-center-ui/src/services/api-client.ts)
- [GitHub Actions Smoke Tests](../.github/workflows/single-origin-smoke.yml)