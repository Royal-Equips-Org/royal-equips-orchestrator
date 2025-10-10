# Frontend Blank Page & API Routing Fix

## Problem Summary

The Royal Equips Command Center at `command.royalequips.nl` was showing a blank page and the frontend was displaying simulated data instead of connecting to the real backend services.

### Root Causes

1. **Frontend Base Path Mismatch**
   - Vite config had `base: '/command-center/'` 
   - But Cloudflare Pages deployment was at root domain `command.royalequips.nl/`
   - All asset paths (`/command-center/assets/*.js`) returned 404
   - Result: **Blank page**

2. **Backend API Routing Mismatch**
   - Frontend calls: `/api/empire/agents`, `/api/empire/metrics`, etc.
   - Backend had routes at: `/v1/agents`, `/v1/metrics`, etc.
   - API calls failed → Frontend fell back to simulated data
   - Result: **No real business data shown**

## Changes Made

### 1. Fixed Frontend Base Path
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

### 2. Fixed Backend API Routes
**File:** `app/routes/empire_real.py`

```diff
# Create empire API blueprint
-empire_bp = Blueprint('empire', __name__, url_prefix='/v1')
+empire_bp = Blueprint('empire', __name__, url_prefix='/api/empire')
```

**Impact:**
- Backend routes now at `/api/empire/*` matching frontend expectations
- Frontend `/api/empire/agents` → Backend `/api/empire/agents` ✓
- Frontend `/api/empire/metrics` → Backend `/api/empire/metrics` ✓
- Real business logic now accessible from frontend

## Deployment Steps

### Step 1: Deploy Backend (Render)

The backend changes are minimal but critical. Once deployed, the API will respond at the correct paths:

```bash
# Backend will automatically redeploy from GitHub on merge to main
# Or manually trigger deployment in Render dashboard
```

**Verify backend deployment:**
```bash
curl https://royal-equips-orchestrator.onrender.com/api/empire/metrics
# Should return JSON with real metrics data
```

### Step 2: Deploy Frontend (Cloudflare Pages)

The frontend build is ready with corrected asset paths:

```bash
cd apps/command-center-ui
pnpm install
pnpm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=command-center
```

**Or via Cloudflare Pages Dashboard:**
1. Go to Cloudflare Dashboard → Pages → command-center
2. Go to Settings → Builds & deployments
3. Trigger manual deployment from `copilot/fix-frontend-blank-page` branch

**Verify frontend deployment:**
```bash
curl https://command.royalequips.nl/
# Should return HTML with asset paths like /assets/index-*.js

curl https://command.royalequips.nl/assets/index-*.js
# Should return JavaScript bundle
```

### Step 3: Verify End-to-End

1. **Open browser:** `https://command.royalequips.nl`
2. **Expected result:** 
   - Command Center UI loads (no blank page)
   - Real agent data displayed (not simulated)
   - Real metrics from Shopify/backend services
3. **Open DevTools Network tab:**
   - Should see successful `/api/empire/*` requests
   - Responses should be JSON with real data
   - No 404 errors on asset files

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
│ - /api/empire/opportunities                                 │
│ - /api/empire/campaigns                                     │
│ - All endpoints with REAL business logic                    │
└─────────────────────────────────────────────────────────────┘
```

## No Mock Data - Real Integrations

The backend `empire_real.py` uses real services:
- ✅ Real agent performance monitoring from orchestrator
- ✅ Real product opportunities from AutoDS/Spocket  
- ✅ Real marketing campaigns from email/SMS systems
- ✅ Real metrics from Shopify/BigQuery
- ✅ NO simulated/mock data in production

## Testing Checklist

- [ ] Backend deployed to Render.com
- [ ] `/api/empire/metrics` returns JSON (not 404)
- [ ] Frontend deployed to Cloudflare Pages  
- [ ] `command.royalequips.nl` loads without blank page
- [ ] Browser DevTools shows no 404 errors
- [ ] Real agent status displayed (not "Demo Agent")
- [ ] Real metrics displayed (not placeholder numbers)
- [ ] API calls in Network tab show successful responses

## Rollback Plan

If issues occur:

### Rollback Frontend
```bash
# Via Cloudflare Pages Dashboard
1. Go to Pages → command-center → Deployments
2. Find previous working deployment
3. Click "Rollback to this deployment"
```

### Rollback Backend
```bash
# Via Render Dashboard
1. Go to royal-equips-orchestrator service
2. Go to Events tab
3. Click "Rollback" on previous deployment
```

### Rollback Code
```bash
git revert HEAD~1
git push origin main
```

## Support

If deployment issues persist:

1. **Check Cloudflare Pages logs:**
   - Dashboard → Pages → command-center → Functions → Logs

2. **Check Render backend logs:**
   - Dashboard → royal-equips-orchestrator → Logs
   - Look for blueprint registration messages
   - Verify "Registered blueprint empire" appears

3. **Check DNS:**
   ```bash
   nslookup command.royalequips.nl
   # Should resolve to Cloudflare Pages
   ```

4. **Check _redirects file:**
   ```bash
   curl https://command.royalequips.nl/_redirects
   # Should show proxy rules for /api/*
   ```

## Related Files

- `apps/command-center-ui/vite.config.ts` - Frontend build config
- `apps/command-center-ui/public/_redirects` - Cloudflare Pages routing
- `apps/command-center-ui/public/config.json` - Runtime API config
- `app/routes/empire_real.py` - Backend API routes
- `app/services/empire_service.py` - Real business logic implementation

## Additional Notes

- Frontend expects API at `/api/empire/*` (configured in `config.json`)
- Backend serves API at `/api/empire/*` (registered in Flask)
- Cloudflare `_redirects` proxies `/api/*` to backend
- All components now aligned - should work seamlessly
