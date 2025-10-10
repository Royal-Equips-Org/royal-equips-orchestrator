# Deployment Checklist - Frontend Blank Page Fix

## Pre-Deployment Verification

### Code Changes
- [x] Frontend base path fixed: `base: '/'` in `vite.config.ts`
- [x] Backend API routes fixed: `url_prefix='/api/empire'` in `empire_real.py`
- [x] Frontend built successfully: `apps/command-center-ui/dist/` ready
- [x] All tests passing: 33/33 frontend tests ✓
- [x] Python syntax validated ✓

### Documentation
- [x] `DEPLOYMENT_FIX_FRONTEND_BLANK_PAGE.md` - Complete deployment guide
- [x] `BEFORE_AFTER_DEPLOYMENT_FIX.md` - Visual before/after comparison
- [x] `DEPLOYMENT_CHECKLIST.md` - This file

## Deployment Steps

### Step 1: Merge to Main
```bash
# Via GitHub PR interface
1. Review PR: copilot/fix-frontend-blank-page
2. Approve PR
3. Merge to main branch
```

### Step 2: Deploy Backend (Automatic)
- [ ] Render.com auto-deploys from `main` branch
- [ ] Wait for deployment to complete (~5 minutes)
- [ ] Verify deployment in Render dashboard
- [ ] Check deployment logs for errors

### Step 3: Verify Backend
```bash
# Test new API endpoint
curl https://royal-equips-orchestrator.onrender.com/api/empire/metrics

# Expected: JSON response (not 404)
# Example: {"total_revenue": 12345, "active_agents": 5, ...}
```

**Backend Verification Checklist:**
- [ ] `/api/empire/metrics` returns 200 OK
- [ ] `/api/empire/agents` returns 200 OK
- [ ] `/api/empire/opportunities` returns 200 OK
- [ ] `/api/empire/campaigns` returns 200 OK
- [ ] Response is JSON (not HTML)
- [ ] No 404 errors in logs

### Step 4: Deploy Frontend

#### Option A: Via Cloudflare Pages Dashboard (Recommended)
1. [ ] Go to Cloudflare Dashboard
2. [ ] Navigate to Pages → command-center
3. [ ] Click "Create deployment"
4. [ ] Select branch: `main` (after merge)
5. [ ] Wait for build & deployment (~3 minutes)
6. [ ] Verify deployment status shows "Success"

#### Option B: Via Wrangler CLI
```bash
cd apps/command-center-ui
pnpm run build
wrangler pages deploy dist --project-name=command-center
```

### Step 5: Verify Frontend Deployment

#### Browser Test
1. [ ] Open https://command.royalequips.nl in browser
2. [ ] Page loads (not blank) ✓
3. [ ] Open DevTools Console - no errors ✓
4. [ ] Open DevTools Network tab
5. [ ] Verify `/assets/*.js` files return 200 OK
6. [ ] Verify no 404 errors

#### API Connectivity Test
1. [ ] Open https://command.royalequips.nl
2. [ ] Open DevTools Network tab
3. [ ] Look for `/api/empire/*` requests
4. [ ] Verify responses are JSON (not HTML)
5. [ ] Verify status codes are 200 (not 404)

#### Real Data Test
1. [ ] Check agent status in UI
2. [ ] Verify agent names are real (e.g., "ProductResearchAgent", not "Demo Agent")
3. [ ] Verify metrics show real numbers from Shopify
4. [ ] Verify no "Simulated" or "Demo" labels

### Step 6: Production Verification

#### Health Checks
```bash
# Check frontend
curl -I https://command.royalequips.nl
# Expected: 200 OK, Content-Type: text/html

# Check API proxy
curl https://command.royalequips.nl/api/empire/metrics
# Expected: 200 OK, Content-Type: application/json

# Check backend directly
curl https://royal-equips-orchestrator.onrender.com/healthz
# Expected: 200 OK, {"status":"healthy"}
```

#### Complete System Check
- [ ] Frontend loads without blank page
- [ ] No 404 errors in browser console
- [ ] API calls to `/api/empire/*` succeed
- [ ] Real agent data displayed (not simulated)
- [ ] Real Shopify metrics displayed
- [ ] Cloudflare Analytics shows successful page loads
- [ ] Render logs show no errors

## Post-Deployment Monitoring

### First 15 Minutes
- [ ] Monitor Cloudflare Pages logs for errors
- [ ] Monitor Render backend logs for API errors
- [ ] Check Sentry for any JavaScript errors
- [ ] Test from multiple devices/browsers

### First Hour
- [ ] Verify user traffic is normal
- [ ] Check for any user-reported issues
- [ ] Monitor API response times
- [ ] Verify all agents are functioning

### First 24 Hours
- [ ] Review analytics for unusual patterns
- [ ] Check error rates vs baseline
- [ ] Verify data sync with Shopify
- [ ] Confirm no data loss or corruption

## Rollback Plan (If Needed)

### Quick Rollback - Cloudflare Pages
1. Go to Cloudflare Dashboard → Pages → command-center
2. Click "Deployments" tab
3. Find previous working deployment
4. Click "Rollback to this deployment"
5. Verify rollback successful

### Quick Rollback - Render Backend
1. Go to Render Dashboard → royal-equips-orchestrator
2. Click "Events" tab
3. Find previous deployment
4. Click "Rollback"
5. Verify rollback successful

### Full Rollback - Git
```bash
# Revert the changes
git revert HEAD~3  # Revert last 3 commits
git push origin main

# Wait for auto-deployment
# Or trigger manual deployment
```

## Success Criteria

✅ **All must be true:**
- [ ] `command.royalequips.nl` loads without blank page
- [ ] Browser shows no 404 errors
- [ ] API calls return real data (200 OK)
- [ ] No "simulated" or "demo" data in UI
- [ ] Real agent names displayed
- [ ] Real Shopify metrics displayed
- [ ] No increase in error rates
- [ ] User traffic normal

## Contacts

**If issues occur:**
- Check logs first (Cloudflare + Render)
- Review rollback plan above
- Escalate if needed

## Notes

- Changes are minimal: 2 lines of code
- No breaking changes to API contracts
- No database migrations needed
- No environment variable changes needed
- All tests passing before deployment

## Post-Deployment Cleanup

After successful deployment (24h+):
- [ ] Update monitoring dashboards
- [ ] Archive old deployment artifacts
- [ ] Update team on successful deployment
- [ ] Document any lessons learned
