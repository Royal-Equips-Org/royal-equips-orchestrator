# Frontend Visibility & API 404 Errors - FIXED

## Problem Summary

The Royal Equips Command Center had the following critical issues:

1. **Frontend not visible on Cloudflare Pages** (`command.royalequips.nl`)
2. **Backend showing frontend instead of working properly** on Render
3. **API calls returning 404 errors** with duplicate `/api/api/` paths

### Log Analysis

```
GET /api/api/shopify/products HTTP/1.1" 404
GET /api/api/shopify/status HTTP/1.1" 404
GET /api/api/shopify/metrics HTTP/1.1" 404
GET /api/api/agents/shopify HTTP/1.1" 404
```

## Root Causes Identified

### 1. Vite Base Path Mismatch
**Issue:** `vite.config.ts` had `base: '/command-center/'` but Cloudflare Pages deployment was at root domain `/`

**Impact:** 
- All asset paths were generated as `/command-center/assets/*.js`
- These returned 404 when accessed at `command.royalequips.nl/command-center/assets/*`
- Result: **Blank page**

### 2. Double `/api/api/` Prefix
**Issue:** Frontend code hardcoded `/api/` in API calls + `apiRelativeBase` also added `/api`

**Impact:**
- Frontend called `/api/shopify/status`
- API client prepended `apiRelativeBase` (`/api`)
- Final URL: `/api/api/shopify/status` ❌
- Result: **404 errors on all API calls**

### 3. Runtime Config Adding `/v1` Suffix
**Issue:** `runtime-config.ts` was automatically appending `/v1` to API base URL

**Impact:**
- Backend routes are at `/api/empire/`, `/api/shopify/`, NOT `/api/v1/`
- Incorrect URL construction
- Result: **More 404 errors**

## Changes Made

### 1. Fixed Vite Base Path
**File:** `apps/command-center-ui/vite.config.ts`

```diff
export default defineConfig({
  plugins: [react()],
- base: '/command-center/',
+ base: '/',
  define: {
```

**Impact:**
- Assets now load from `/assets/*.js` (root-relative)
- Works correctly when deployed to `command.royalequips.nl`
- No more 404 errors on asset files

### 2. Fixed Runtime Config
**File:** `apps/command-center-ui/src/lib/runtime-config.ts`

```diff
function getApiBaseUrl(config: any): string {
- // Always target Fastify API base /v1 (reverse-proxied in prod)
+ // Use the configured API base without modification
+ // Backend routes are at /api/empire/, /api/v2/, etc.
  if (isDevelopment()) {
-   return config.development?.apiRelativeBase || 'http://localhost:10000/v1';
+   return config.development?.apiRelativeBase || 'http://localhost:10000';
  }
  if (config.apiRelativeBase) {
-   // If apiRelativeBase is absolute, use URL constructor
-   try {
-     const url = new URL('/v1', config.apiRelativeBase);
-     return url.toString();
-   } catch {
-     // If apiRelativeBase is relative, fallback to safe string concatenation
-     return config.apiRelativeBase.replace(/\/$/, '') + '/v1';
-   }
+   return config.apiRelativeBase;
  }
- return '/v1';
+ return '/api';
}
```

### 3. Removed `/api/` Prefix from Frontend API Calls

Updated API calls in:
- **ShopifyModule.tsx** (6 calls)
- **EnterpriseApp.tsx** (3 calls)
- **AuditComplianceModule.tsx** (5 calls)
- **SettingsModule.tsx** (3 calls)
- **AnalyticsModule.tsx** (1 call)

**Before:**
```typescript
apiClient.get('/api/shopify/status')
```

**After:**
```typescript
apiClient.get('/shopify/status')
```

**Result:**
- Frontend calls: `/shopify/status`
- With `apiRelativeBase = "/api"`
- Final URL: `/api/shopify/status` ✅

## Architecture After Fix

```
┌─────────────────────────────────────────────────────────────┐
│ DNS: command.royalequips.nl                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Pages (React UI at root /)                      │
│ - Serves HTML, CSS, JS from /                              │
│ - _redirects proxy /api/* to backend                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ /api/* requests
┌─────────────────────────────────────────────────────────────┐
│ Render.com (Flask Backend)                                  │
│ - /api/empire/agents                                        │
│ - /api/empire/metrics                                       │
│ - /api/shopify/status                                       │
│ - /api/shopify/products                                     │
│ - /api/analytics/dashboard                                  │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Steps

### Step 1: Verify Changes Locally

```bash
cd apps/command-center-ui
npm install
npm run build

# Verify assets use / not /command-center/
head -20 dist/index.html
# Should show: <script src="/assets/index-*.js">

# Verify _redirects is present
cat dist/_redirects

# Verify config.json
cat dist/config.json
```

### Step 2: Deploy Frontend (Cloudflare Pages)

**Option A: Via Cloudflare Dashboard**
1. Go to Cloudflare Dashboard → Pages → command-center
2. Go to Settings → Builds & deployments
3. Trigger manual deployment from `copilot/fix-frontend-visibility-issue` branch

**Option B: Via Wrangler CLI**
```bash
cd apps/command-center-ui
wrangler pages deploy dist --project-name=command-center
```

**Verify frontend deployment:**
```bash
# Check assets load correctly
curl https://command.royalequips.nl/
# Should return HTML with asset paths like /assets/index-*.js

curl -I https://command.royalequips.nl/assets/index-[hash].js
# Should return 200 OK
```

### Step 3: Verify Backend (Render)

Backend doesn't need changes, but verify it's running:

```bash
# Check health
curl https://royal-equips-orchestrator.onrender.com/healthz
# Should return: ok

# Check API endpoints
curl https://royal-equips-orchestrator.onrender.com/api/empire/opportunities
# Should return JSON (not HTML)
```

### Step 4: Verify End-to-End

Open browser to `https://command.royalequips.nl` and check:

1. ✅ **Frontend loads** (not blank page)
2. ✅ **Assets load** (no 404s in console)
3. ✅ **API calls work** (no `/api/api/` errors)
4. ✅ **Data displays** (real data from backend)

Check browser console for errors:
```
✅ No "Failed to fetch" errors
✅ No 404 errors on /assets/*
✅ No 404 errors on /api/*
```

## API Call Patterns (After Fix)

### Frontend Empire Service
```typescript
// Correct patterns
apiClient.get('/empire/metrics')      → /api/empire/metrics
apiClient.get('/empire/agents')       → /api/empire/agents
apiClient.get('/empire/opportunities') → /api/empire/opportunities
```

### Frontend Shopify Module
```typescript
// Correct patterns
apiClient.get('/shopify/status')   → /api/shopify/status
apiClient.get('/shopify/metrics')  → /api/shopify/metrics
apiClient.get('/shopify/products') → /api/shopify/products
```

### Frontend Analytics Module
```typescript
// Correct patterns
apiClient.get('/analytics/dashboard') → /api/analytics/dashboard
```

## Backend Route Registration

Flask blueprints are correctly registered:

```python
# app/__init__.py
blueprints_config = [
    ('app.routes.empire_real', 'empire_bp', None),          # Prefix: /api/empire
    ('app.routes.royalgpt_api', 'royalgpt_bp', '/api'),     # Prefix: /api
    ('app.blueprints.shopify', 'shopify_bp', None),         # Prefix: /api/shopify
    ('app.routes.analytics', 'analytics_bp', None),         # Prefix: /api/analytics
]
```

Backend routes:
- `/api/empire/agents` ✅
- `/api/empire/metrics` ✅
- `/api/shopify/status` ✅
- `/api/shopify/products` ✅
- `/api/analytics/dashboard` ✅

## Configuration Files

### config.json (Production)
```json
{
  "apiRelativeBase": "/api",
  "featureFlags": {
    "enable3D": false,
    "enableMetricsPolling": true,
    "enableCircuitBreaker": true,
    "enableHealthMonitoring": true
  }
}
```

### _redirects (Cloudflare Pages)
```
# Proxy API requests to Flask backend
/api/*  https://royal-equips-orchestrator.onrender.com/api/:splat  200
/health  https://royal-equips-orchestrator.onrender.com/health  200
/healthz  https://royal-equips-orchestrator.onrender.com/healthz  200
/readyz  https://royal-equips-orchestrator.onrender.com/readyz  200
/metrics  https://royal-equips-orchestrator.onrender.com/metrics  200

# SPA fallback - serve index.html for all other routes
/*  /index.html  200
```

## Troubleshooting

### Issue: Frontend Still Blank

**Diagnosis:**
```bash
# Check if assets are accessible
curl -I https://command.royalequips.nl/assets/index-[hash].js
```

**Solutions:**
1. Clear browser cache (Ctrl+Shift+R)
2. Check Cloudflare Pages deployment status
3. Verify Vite `base: '/'` is set correctly
4. Rebuild and redeploy frontend

### Issue: API Calls Still 404

**Diagnosis:**
```bash
# Check if _redirects is working
curl -I https://command.royalequips.nl/api/empire/opportunities
# Should redirect to backend, not return HTML

# Check backend directly
curl https://royal-equips-orchestrator.onrender.com/api/empire/opportunities
```

**Solutions:**
1. Verify _redirects file is in `dist/` folder
2. Check Cloudflare Pages logs for redirect errors
3. Verify backend is running on Render
4. Check that frontend API calls don't have `/api/` prefix

### Issue: Double `/api/api/` Still Happening

**Diagnosis:**
```bash
# Check frontend code
grep -r "apiClient.*('/api/" apps/command-center-ui/src
# Should return 0 results
```

**Solutions:**
1. Verify all frontend API calls use relative paths (without `/api/` prefix)
2. Verify `apiRelativeBase` in config.json is `/api`
3. Rebuild frontend after changes

## Related Documentation

- `DEPLOYMENT_FIX_FRONTEND_BLANK_PAGE.md` - Previous frontend deployment fixes
- `CLOUDFLARE_DASHBOARD_CONFIG.md` - Cloudflare Pages configuration
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Full production deployment guide
- `BEFORE_AFTER_DEPLOYMENT_FIX.md` - Before/after comparison

## Success Criteria

✅ Frontend is visible at `command.royalequips.nl`  
✅ Assets load correctly (no 404s on `/assets/*`)  
✅ API calls work (no 404s on `/api/*`)  
✅ No duplicate `/api/api/` paths in logs  
✅ Real data displays from backend  
✅ No console errors in browser  

---

**Issue Resolution Date:** 2025-10-14  
**Fixed By:** Copilot Agent  
**Branch:** `copilot/fix-frontend-visibility-issue`  
