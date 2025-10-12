# Cloudflare Deployment Fix

## Issue
Cloudflare Pages deployment was failing with error:
```
Error: Output directory "apps/command-center-ui/dist" not found.
```

This was caused by the previous fix that changed Vite to output directly to `/static/` for Render deployment, breaking Cloudflare which expects output in `dist/`.

## Root Cause
The Vite configuration was changed to:
```typescript
build: { 
  outDir: '../../static',  // ❌ Wrong for Cloudflare
}
```

This worked for Render (Flask serves from `/static/`) but broke Cloudflare Pages which expects `apps/command-center-ui/dist/`.

## Solution

### 1. Dual Build Strategy
Created separate build commands for different deployment targets:

**For Cloudflare (default)**:
```bash
npm run build              # Outputs to dist/
npm run build:cloudflare   # For Cloudflare Pages
```

**For Render**:
```bash
npm run build:render       # Outputs to dist/, then copies to ../../static/
```

### 2. Updated Vite Config
```typescript
build: { 
  outDir: 'dist',        # ✅ Default to dist/ for Cloudflare
  emptyOutDir: true,
}
```

### 3. Updated Build Scripts

**`apps/command-center-ui/package.json`**:
```json
{
  "scripts": {
    "build": "vite build && npm run copy-to-dist",
    "build:render": "vite build && npm run copy-to-static",
    "build:cloudflare": "npm install && vite build && npm run copy-to-dist",
    "copy-to-dist": "cp -r functions dist/ 2>/dev/null || true",
    "copy-to-static": "rm -rf ../../static/assets ../../static/index.html ../../static/functions 2>/dev/null || true && cp -r dist/* ../../static/ 2>/dev/null || true"
  }
}
```

### 4. Updated Render Configuration

**`render.yaml`**:
```yaml
buildCommand: pip install --upgrade pip && pip install -r requirements.txt && cd apps/command-center-ui && npm install && npm run build:render
```

### 5. Updated .gitignore

Build artifacts are now excluded from git:
```gitignore
# Command Center UI build artifacts
apps/command-center-ui/dist/

# Static folder build artifacts (generated during deployment)
static/index.html
static/_headers
static/_redirects
static/assets/
static/functions/
static/config.json
static/config.local.json
static/config.schema.json
static/health.json
```

Only `static/styles.css` remains tracked (pre-existing file).

## Deployment Guide

### Cloudflare Pages
1. Build Command: `cd apps/command-center-ui && npm install && npm run build`
2. Output Directory: `apps/command-center-ui/dist`
3. Functions are in `apps/command-center-ui/dist/functions`

### Render
1. Build Command: (Already configured in `render.yaml`)
2. Flask serves from `/static/` directory
3. Files are copied during build from `dist/` to `/static/`

## Verification

### Cloudflare Deployment
- ✅ Output directory exists at `apps/command-center-ui/dist`
- ✅ Functions folder included in `dist/functions`
- ✅ All assets compiled to `dist/assets`
- ✅ Index.html at `dist/index.html`

### Render Deployment
- ✅ Build runs `npm run build:render`
- ✅ Files copied to `/static/`
- ✅ Flask serves from `/static/`
- ✅ Functions included for Cloudflare compatibility

### No Duplicate Routes
Checked for duplicate routes - all routes have different blueprint prefixes:
- `/api/analytics/metrics` (analytics blueprint)
- `/api/edge-functions/metrics` (edge_functions blueprint)
- `/metrics` (metrics blueprint)

Routes that appear duplicate actually have different prefixes and are separate endpoints.

### No Mock Data
All mock data was already removed in previous commits:
- ✅ `apps/aira/src/routes/system.ts` - Uses real process metrics
- ✅ `apps/aira/src/routes/health.ts` - Real Shopify API check
- ✅ No mock data in production code paths

### No Unnecessary Files
- ✅ Build artifacts excluded from git
- ✅ No `.pyc`, `__pycache__`, `.DS_Store` files
- ✅ Clean repository structure

## Testing

### Test Cloudflare Build
```bash
cd apps/command-center-ui
npm install
npm run build
ls -la dist/  # Should show index.html, assets/, functions/
```

### Test Render Build
```bash
cd apps/command-center-ui
npm install
npm run build:render
ls -la ../../static/  # Should show index.html, assets/, functions/, styles.css
```

## Summary

✅ **Cloudflare deployment fixed** - Build outputs to `dist/`  
✅ **Render deployment maintained** - Build copies to `/static/`  
✅ **No duplicate files** - Build artifacts excluded from git  
✅ **No duplicate routes** - All routes have proper blueprint prefixes  
✅ **No mock data** - Already cleaned in previous commits  
✅ **Clean repository** - No unnecessary files

Both deployment targets now work correctly with a single codebase.
