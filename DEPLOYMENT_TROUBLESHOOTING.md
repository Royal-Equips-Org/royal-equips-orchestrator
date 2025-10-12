# Deployment Troubleshooting Guide

This guide addresses common deployment issues on Render and other platforms.

## Issue 1: Frontend Shows White/Empty Page

### Symptoms
- Accessing the root URL (`/`) shows a blank white page
- Browser console shows 404 errors for JavaScript/CSS files
- Network tab shows failed requests to `/assets/*` files

### Root Cause
React UI is not built or not copied to the Flask static folder during deployment.

### Solution

#### For Render Deployment
The `render.yaml` includes the correct build command:
```yaml
buildCommand: pip install --upgrade pip && pip install -r requirements.txt && cd apps/command-center-ui && npm install && npm run build:render
```

Ensure:
1. Node.js is available in the build environment (Render provides it)
2. The build command completes successfully (check build logs)
3. Files are copied to `/static/` directory

#### Manual Build (for testing locally)
```bash
cd apps/command-center-ui
pnpm install
pnpm run build:render
```

This will:
1. Build the React app with Vite
2. Copy all files from `dist/` to `../../static/`
3. Flask will serve these files at `/command-center` and root redirects there

#### Verification
After deployment, check that these files exist in `/static/`:
- `index.html`
- `assets/` directory with JS/CSS bundles

## Issue 2: Shopify Integration Errors

### Symptoms
```
ERROR:app.services.shopify_graphql_service:Failed to initialize Shopify service: Header value must be str or bytes, not <class 'core.secrets.secret_provider.SecretResult'>
ERROR:app.sockets:Shopify unavailable - empire status incomplete
```

### Root Cause
SecretResult objects were being used directly as HTTP header values instead of extracting the `.value` attribute.

### Solution
**FIXED** in commit `31a65fa`. The code now properly extracts values:
```python
shop_name_result = await self.secrets.get_secret('SHOPIFY_SHOP_NAME')
self._shop_name = shop_name_result.value if hasattr(shop_name_result, 'value') else str(shop_name_result)
```

### Required Environment Variables
In Render dashboard, set these secrets:
- `SHOPIFY_SHOP_NAME` - Your store name (e.g., `your-store` from `your-store.myshopify.com`)
- `SHOPIFY_ACCESS_TOKEN` - Admin API access token from Shopify Admin

## Issue 3: SECRET_ENCRYPTION_KEY Warning Spam

### Symptoms
```
{"level": "warn", "event": "secret_encryption_key_default", "message": "Using default encryption key - set SECRET_ENCRYPTION_KEY in production"}
```
This warning appears many times in logs (once per UnifiedSecretResolver instantiation).

### Root Cause
Multiple instances of `UnifiedSecretResolver` were being created, each printing the warning.

### Solution
**FIXED** in commit `31a65fa`. Added module-level flag to show warning only once:
```python
_default_key_warning_shown = False

def _derive_key(self) -> bytes:
    global _default_key_warning_shown
    if seed == "royal-equips-default-dev-key-change-in-prod" and not _default_key_warning_shown:
        print(...)  # Warning printed only once
        _default_key_warning_shown = True
```

### Recommended Action (Optional)
For production, set a custom encryption key in Render:
```bash
SECRET_ENCRYPTION_KEY=<generate-random-32-char-string>
```
Generate with: `openssl rand -hex 32`

## Issue 4: AIRA OpenAI Integration Not Working

### Symptoms
- AIRA shows error popup instead of responding
- Logs show: "OpenAI API key not found in any source - AIRA will operate in fallback mode"

### Root Cause
OpenAI key validation was too strict (required exact 51 characters).

### Solution
**FIXED** in commit `31a65fa`. Validation now accepts:
- Legacy keys: `sk-` + 48 alphanumeric chars
- Project-scoped keys: `sk-proj-` + variable length
- Minimum length: 20 characters

```typescript
function isValidOpenAIKey(key: string): boolean {
  return typeof key === 'string' && key.length >= 20 && /^sk-[A-Za-z0-9_-]+$/.test(key);
}
```

### Required Environment Variable
In Render dashboard, set:
- `OPENAI_API_KEY` - Your OpenAI API key (starts with `sk-`)

Get your key from: https://platform.openai.com/api-keys

## Issue 5: Unknown Action Warnings

### Symptoms
```
WARNING:app.services.autonomous_empire_agent:Unknown action: refactor_legacy_code
WARNING:app.services.autonomous_empire_agent:Unknown action: analyze_bottlenecks
```

### Root Cause
Autonomous empire agent was triggering actions that weren't implemented in the action executor.

### Solution
**FIXED** in commit `0c1ec1a`. Added missing action handlers:
- `refactor_legacy_code` - Triggers code quality improvement
- `analyze_bottlenecks` - Initiates bottleneck analysis
- `explore_optimizations` - Explores optimization opportunities

## Deployment Checklist

### Pre-Deployment
- [ ] Ensure all required secrets are set in Render dashboard
- [ ] Verify `render.yaml` includes React build command
- [ ] Test locally with `make test`
- [ ] Run linter: `make lint`

### Post-Deployment
- [ ] Check build logs for successful React build
- [ ] Verify health endpoint: `curl https://your-app.onrender.com/healthz`
- [ ] Test frontend loads: Visit root URL in browser
- [ ] Check Shopify integration: Monitor logs for Shopify errors
- [ ] Test AIRA: Try chat functionality in UI

### Required Secrets (Minimum)
For basic functionality:
```
FLASK_ENV=production
SECRET_KEY=<auto-generated>
PORT=10000
```

For Shopify integration:
```
SHOPIFY_SHOP_NAME=your-store
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
```

For AIRA:
```
OPENAI_API_KEY=sk-xxxxx
```

### Optional Secrets
```
SENTRY_DSN=<for error monitoring>
DATABASE_URL=<for persistence>
REDIS_URL=<for caching>
GITHUB_TOKEN=<for GitHub integration>
AUTO_DS_API_KEY=<for dropshipping>
SPOCKET_API_KEY=<for EU suppliers>
```

## Common Error Messages

### 1. "Shopify credentials not configured"
**Solution**: Set `SHOPIFY_SHOP_NAME` and `SHOPIFY_ACCESS_TOKEN` in Render

### 2. "Failed to connect to Shopify API"
**Solution**: Verify access token is valid and has correct permissions

### 3. "OpenAI API authentication failed"
**Solution**: Verify API key is valid at https://platform.openai.com/api-keys

### 4. "Asset not found" (404 for /assets/*)
**Solution**: Re-run build with `npm run build:render` to copy files to static folder

### 5. "gunicorn: command not found"
**Solution**: Ensure `gunicorn` is in `requirements.txt`

## Monitoring Production

### Health Endpoints
- `/healthz` - Liveness probe (returns "ok")
- `/readyz` - Readiness probe (checks dependencies)
- `/metrics` - Prometheus metrics (if enabled)

### Log Monitoring
Watch for these critical errors:
```bash
grep -i "error" logs.txt | grep -v "404"
```

### Performance Metrics
- Response time for `/api/empire/metrics`
- WebSocket connection stability
- Agent execution success rate

## Getting Help

If issues persist after following this guide:
1. Check Render build logs for specific errors
2. Review Flask application logs
3. Test locally with same environment variables
4. Open an issue on GitHub with:
   - Error messages from logs
   - Environment variables set (redact sensitive values)
   - Steps to reproduce
