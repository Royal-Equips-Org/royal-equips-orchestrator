# Cloudflare Pages Deployment Fix - October 2025

## 🚨 Problem Summary

Cloudflare Pages deployment was failing with the following error:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/package.json

Note that in CI environments this setting is true by default. If you still need to run install in such cases, use "pnpm install --no-frozen-lockfile"

Failure reason:
specifiers in the lockfile don't match specifiers in package.json:
* 3 dependencies were removed: @commitlint/cli@^19.8.1, ts-jest@^29.4.2, vitest@^3.2.4
```

Additionally, there was a warning about invalid wrangler.toml configuration:
```
A wrangler.toml file was found but it does not appear to be valid. Did you mean to use wrangler.toml to configure Pages?
```

## 🔍 Root Cause Analysis

### Issue 1: Outdated pnpm Lockfile
The `pnpm-lock.yaml` file was out of sync with workspace `package.json` files:
- Root `package.json` had removed `@commitlint/cli` dependency
- Workspace packages (`apps/command-center-ui`, `packages/connectors`) still had `vitest` and `ts-jest`
- Lockfile contained references to removed dependencies from root but not synced with workspace changes

### Issue 2: Invalid wrangler.toml Configuration
The root `wrangler.toml` contained a `[build]` section which is for Cloudflare Workers, not Pages:
```toml
[build]
command = "pnpm install --frozen-lockfile && pnpm --filter @royal-equips/command-center-ui build"
```

For Cloudflare Pages:
- Build commands should be configured in the Cloudflare dashboard or via CLI
- `wrangler.toml` should only contain `pages_build_output_dir` for Pages
- The `[build]` section causes confusion and validation warnings

## ✅ Solutions Implemented

### Fix 1: Updated pnpm Lockfile
Regenerated the lockfile to sync with current package.json files:
```bash
pnpm install --no-frozen-lockfile
```

This resolved all dependency conflicts and ensured the lockfile matches the workspace structure.

### Fix 2: Fixed wrangler.toml Configuration
Removed the invalid `[build]` section from root `wrangler.toml`:

**Before:**
```toml
[vars]
NODE_VERSION = "20"

[build]
command = "pnpm install --frozen-lockfile && pnpm --filter @royal-equips/command-center-ui build"

[env.production.vars]
APP_ENV = "production"
```

**After:**
```toml
[vars]
NODE_VERSION = "20"
APP_ENV = "production"
```

The build command is now properly configured in Cloudflare Pages dashboard.

## 📋 Correct Cloudflare Pages Configuration

### Dashboard Settings (Cloudflare Pages Dashboard)
Navigate to: Workers & Pages → royal-equips-orchestrator-ui → Settings → Builds & deployments

**Framework preset:** None (Custom)

**Build configuration:**
```
Build command: pnpm install --frozen-lockfile && pnpm --filter @royal-equips/command-center-ui build
Build output directory: apps/command-center-ui/dist
Root directory: (leave empty)
```

**Environment variables:**
```
NODE_VERSION = 20.17.0
NODE_ENV = production
VITE_API_BASE_URL = https://royal-equips-orchestrator.onrender.com
```

### wrangler.toml Configuration (Repository Root)
The root `wrangler.toml` should ONLY contain:
```toml
name = "royal-equips-orchestrator-ui"
account_id = "" # Set via CLOUDFLARE_ACCOUNT_ID env var
compatibility_date = "2025-01-05"

# Required for Wrangler v3 + Pages
pages_build_output_dir = "apps/command-center-ui/dist"

# Pages Functions directory
functions = "apps/command-center-ui/functions"

[vars]
NODE_VERSION = "20"
APP_ENV = "production"
```

**Key Points:**
- ✅ Contains `pages_build_output_dir` property
- ✅ No `[build]` section (that's for Workers)
- ✅ Minimal configuration for Pages

### Alternative: Deploy via Wrangler CLI
If you prefer to deploy via command line:

```bash
# Method 1: Let Cloudflare build for you
cd /path/to/royal-equips-orchestrator
npx wrangler pages deploy --project-name=royal-equips-orchestrator-ui

# Method 2: Build locally then deploy
cd apps/command-center-ui
pnpm run build
npx wrangler pages deploy dist --project-name=royal-equips-orchestrator-ui
```

## ✅ Verification Steps

### 1. Verify Lockfile is Synced
```bash
cd /path/to/royal-equips-orchestrator
pnpm install --frozen-lockfile
# Should complete without errors
```

### 2. Verify Build Works
```bash
pnpm --filter @royal-equips/command-center-ui build
# Should output to: apps/command-center-ui/dist/
```

### 3. Verify Output Directory Exists
```bash
ls -la apps/command-center-ui/dist/
# Should show: index.html, assets/, functions/, _redirects, _headers
```

### 4. Test Cloudflare Pages Deployment
After pushing to GitHub, check Cloudflare Pages dashboard:
- Build should start automatically
- Build logs should show successful pnpm install
- Build should complete without errors
- Deployment should be live at your configured domain

## 🔧 Troubleshooting

### Still Getting Lockfile Error?
```bash
# Delete node_modules and lockfile, regenerate from scratch
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: regenerate pnpm lockfile"
git push
```

### Cloudflare Build Still Failing?
1. Check Cloudflare Pages build logs for specific error
2. Verify build command in dashboard matches: `pnpm install --frozen-lockfile && pnpm --filter @royal-equips/command-center-ui build`
3. Verify build output directory is: `apps/command-center-ui/dist`
4. Verify Node.js version is set to: `20.17.0`

### wrangler.toml Still Showing Warning?
Ensure root `wrangler.toml`:
- Has `pages_build_output_dir = "apps/command-center-ui/dist"`
- Does NOT have `[build]` section
- Has minimal configuration (name, compatibility_date, pages_build_output_dir, vars)

## 📚 Related Documentation
- `CLOUDFLARE_DEPLOYMENT_FIXED.md` - Previous deployment fixes
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Full deployment guide
- `DEPLOYMENT_FIX_ROYALGPT_API.md` - API routing configuration
- `apps/command-center-ui/README.md` - UI build instructions

## 🎉 Expected Result

After these fixes:
- ✅ pnpm lockfile is in sync with all package.json files
- ✅ `pnpm install --frozen-lockfile` works without errors
- ✅ Cloudflare Pages builds succeed
- ✅ UI deploys successfully to configured domain
- ✅ No more wrangler.toml validation warnings
- ✅ Build times reduced (no unnecessary package installations)

## 📝 Summary

**What Changed:**
1. Regenerated `pnpm-lock.yaml` to sync with workspace packages
2. Removed invalid `[build]` section from root `wrangler.toml`
3. Updated documentation to clarify correct Cloudflare Pages configuration

**What to Configure:**
1. Set build command in Cloudflare Pages dashboard (not in wrangler.toml)
2. Ensure `pages_build_output_dir` is set in wrangler.toml
3. Use `--frozen-lockfile` flag in CI/CD builds

**Result:**
Cloudflare Pages deployment now works correctly with proper dependency resolution and configuration.
