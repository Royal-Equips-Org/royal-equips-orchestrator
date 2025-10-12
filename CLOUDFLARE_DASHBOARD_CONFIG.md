# Cloudflare Pages Dashboard Configuration Guide

## 🎯 Quick Setup Checklist

After fixing the repository issues (lockfile and wrangler.toml), you need to configure Cloudflare Pages dashboard correctly.

### Step 1: Navigate to Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Click **Workers & Pages** in the left sidebar
4. Find your project: **royal-equips-orchestrator-ui**
5. Click **Settings** tab
6. Click **Builds & deployments** section

### Step 2: Configure Build Settings

Click **Edit configuration** and set the following:

#### Framework preset
```
None (or Custom)
```

#### Build command
```bash
pnpm install --frozen-lockfile && pnpm --filter @royal-equips/command-center-ui build
```

**Important:** 
- Use `--frozen-lockfile` to ensure reproducible builds
- Use `--filter` to build only the UI package (faster builds)
- This command must match the workspace structure

#### Build output directory
```
apps/command-center-ui/dist
```

**Note:** This is relative to the repository root, NOT the package root.

#### Root directory (path)
```
(leave empty or blank)
```

**Important:** Do NOT set this to `apps/command-center-ui` - the build command already handles the path.

### Step 3: Configure Environment Variables

Click **Environment variables** tab and add:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NODE_VERSION` | `20.17.0` | Production & Preview |
| `NODE_ENV` | `production` | Production only |
| `VITE_API_BASE_URL` | `https://royal-equips-orchestrator.onrender.com` | Production & Preview |

**Optional Variables** (if using Sentry, Supabase, etc.):
```bash
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
```

### Step 4: Configure Git Integration

Under **Builds & deployments** → **Branch deployments**:

#### Production branch
```
master
```

#### Preview branches
```
All non-production branches
```

This ensures:
- Commits to `master` deploy to production
- PRs get preview deployments automatically

### Step 5: Configure Build Cache (Optional but Recommended)

Under **Builds & deployments** → **Build configuration**:

Enable **Build cache** to speed up builds:
- ✅ Cache `node_modules`
- ✅ Cache pnpm store

This will cache dependencies between builds, significantly reducing build time.

## ⚙️ Advanced Settings

### Custom Domains
Under **Custom domains** tab:
1. Add your custom domain: `command.royalequips.nl`
2. Configure DNS records:
   ```
   Type: CNAME
   Name: command
   Target: royal-equips-orchestrator-ui.pages.dev
   ```

### Functions (Edge Functions)
The UI includes Cloudflare Pages Functions in `apps/command-center-ui/functions/`:
- These are automatically deployed with the build
- No additional configuration needed
- Functions are available at `/_functions/*` routes

### Redirects and Headers
Static files in `apps/command-center-ui/public/`:
- `_redirects` - Proxy rules for API endpoints
- `_headers` - Security headers
- These are automatically copied to `dist/` during build

## 🧪 Testing the Configuration

### Test 1: Trigger a Build
1. Go to **Deployments** tab
2. Click **Retry deployment** on the latest deployment
3. Watch the build logs for:
   - ✅ `pnpm install --frozen-lockfile` succeeds
   - ✅ Build completes without errors
   - ✅ Output directory `apps/command-center-ui/dist` is found

### Test 2: Verify Deployment
After successful build:
1. Click the deployment URL (e.g., `https://royal-equips-orchestrator-ui.pages.dev`)
2. Verify the UI loads correctly
3. Check browser console for errors
4. Test API endpoints: `/api/agents/status`, `/health`

### Test 3: Check Build Logs
In the deployment details, verify:
```
✓ pnpm install --frozen-lockfile completed
✓ Building @royal-equips/command-center-ui...
✓ vite build completed in 13.01s
✓ Output directory found: apps/command-center-ui/dist
✓ Deployment successful
```

## 🚨 Troubleshooting

### Error: "Output directory not found"
**Fix:** Verify build output directory is set to `apps/command-center-ui/dist` (NOT just `dist`)

### Error: "pnpm-lock.yaml is not up to date"
**Fix:** 
1. Pull latest changes from repository (lockfile was updated)
2. Or manually trigger a rebuild in Cloudflare dashboard

### Error: "Build command failed"
**Fix:** Check that build command exactly matches:
```bash
pnpm install --frozen-lockfile && pnpm --filter @royal-equips/command-center-ui build
```

### Build is Slow
**Fixes:**
1. Enable build cache in settings
2. Verify using `--filter` to build only UI package
3. Check for unnecessary dependencies being installed

### API Endpoints Return 404
**Fixes:**
1. Verify `_redirects` file is in `apps/command-center-ui/public/`
2. Check that `_redirects` is copied to `dist/` during build
3. Verify backend URL in environment variables

## 📊 Expected Build Performance

After correct configuration:
- **First build:** ~2-3 minutes (clean install + build)
- **Subsequent builds:** ~1-2 minutes (with cache)
- **Bundle size:** ~1.3MB uncompressed, ~366KB compressed
- **Build output:** ~45 optimized chunks with code splitting

## 📝 Configuration Summary

| Setting | Value |
|---------|-------|
| Framework | None (Custom) |
| Build command | `pnpm install --frozen-lockfile && pnpm --filter @royal-equips/command-center-ui build` |
| Build output | `apps/command-center-ui/dist` |
| Root directory | (empty) |
| Node version | 20.17.0 |
| Production branch | master |
| Build cache | Enabled |

## ✅ Verification Checklist

Before closing this guide, verify:
- [ ] Build command is correctly set in dashboard
- [ ] Build output directory is `apps/command-center-ui/dist`
- [ ] Root directory is empty/blank
- [ ] Environment variables are set
- [ ] Build cache is enabled
- [ ] Latest deployment succeeded
- [ ] UI is accessible at deployment URL
- [ ] API endpoints work correctly
- [ ] No console errors in browser

## 🔗 Related Documentation
- `CLOUDFLARE_PAGES_FIX.md` - Technical details of the fix
- `CLOUDFLARE_DEPLOYMENT_FIXED.md` - Previous deployment fixes
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Full production deployment guide
- `wrangler.toml` - Cloudflare Pages configuration file
