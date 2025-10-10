# Royal Equips Orchestrator - Production Deployment Guide

## 🎯 Complete Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ DNS: command.royalequips.nl (Cloudflare DNS)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Worker (Proxy)                                   │
│ - Routes /api/* → Backend                                   │
│ - Routes /* → Frontend                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────┐           ┌─────────────────────┐
│ Flask Backend    │           │ React Frontend      │
│ (Render.com)     │           │ (Cloudflare Pages)  │
│                  │           │                     │
│ Port: 10000      │           │ Build: Vite         │
│ Workers: 1       │           │ SPA fallback        │
│ WebSocket: ✅     │           │                     │
└──────────────────┘           └─────────────────────┘
```

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

#### Backend (Render.com)
Required variables:
```bash
# Flask Configuration
FLASK_ENV=production
PORT=10000
SECRET_KEY=<generate-strong-key>
LOG_LEVEL=INFO

# Shopify Integration (Required for core functionality)
SHOPIFY_API_KEY=<your-shopify-api-key>
SHOPIFY_API_SECRET=<your-shopify-api-secret>
SHOP_NAME=<your-shop-name>
SHOPIFY_ACCESS_TOKEN=<your-access-token>
SHOPIFY_STORE=<your-store>.myshopify.com

# OpenAI (Required for AI features)
OPENAI_API_KEY=<your-openai-api-key>

# Sentry (Optional but recommended)
SENTRY_DSN=<your-sentry-dsn>
ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=1.0

# Database (Optional - for agent persistence)
DATABASE_URL=<postgresql-connection-string>

# Redis (Optional - for caching)
REDIS_URL=<redis-connection-string>

# GitHub Integration (Optional)
GITHUB_TOKEN=<your-github-token>

# Additional Integrations (Optional)
AUTO_DS_API_KEY=<your-autods-key>
SPOCKET_API_KEY=<your-spocket-key>
KLAVIYO_API_KEY=<your-klaviyo-key>
FACEBOOK_ACCESS_TOKEN=<your-facebook-token>
ZENDESK_DOMAIN=<your-domain>
ZENDESK_API_TOKEN=<your-token>
ZENDESK_EMAIL=<your-email>
```

#### Frontend (Cloudflare Pages)
```bash
# API Configuration
VITE_API_BASE_URL=https://command.royalequips.nl
VITE_API_URL=https://command.royalequips.nl

# Optional: Sentry Frontend
VITE_SENTRY_DSN=<your-frontend-sentry-dsn>
```

#### Cloudflare Worker
```bash
# Configured in wrangler.toml
UPSTREAM_API_BASE=https://royal-equips-orchestrator.onrender.com
ALLOWED_ORIGINS=*
```

### 2. Required Accounts
- ✅ GitHub account with repository access
- ✅ Render.com account (for backend hosting)
- ✅ Cloudflare account with domain access
- ✅ Shopify store with API credentials
- ✅ OpenAI account with API key
- ⏸️ Optional: Sentry account for error monitoring

---

## 🚀 Step-by-Step Deployment

### Step 1: Backend Deployment (Render.com)

#### Option A: Auto-Deploy via render.yaml (Recommended)

1. **Connect GitHub Repository**
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository: `Royal-Equips-Org/royal-equips-orchestrator`

2. **Configure via Blueprint**
   - Render will detect `render.yaml` automatically
   - Service name: `royal-equips-orchestrator`
   - Region: Frankfurt (or closest to your users)
   - Plan: Starter ($7/month) or higher

3. **Set Environment Variables**
   - Go to Dashboard → royal-equips-orchestrator → Environment
   - Add all required environment variables (see list above)
   - Click "Save Changes"

4. **Trigger Deployment**
   - Deployment starts automatically after saving environment variables
   - Monitor logs: Dashboard → royal-equips-orchestrator → Logs
   - Wait for "Build succeeded" and "Deploy live"

5. **Verify Backend Health**
   ```bash
   curl https://royal-equips-orchestrator.onrender.com/healthz
   # Expected: "ok"
   
   curl https://royal-equips-orchestrator.onrender.com/readyz
   # Expected: JSON with status "healthy" or "degraded"
   
   curl https://royal-equips-orchestrator.onrender.com/api/agents/status
   # Expected: JSON with agents array
   ```

#### Option B: Manual Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t royal-equips-orchestrator:latest .
   ```

2. **Test Locally**
   ```bash
   docker run -d --name test-orchestrator \
     -p 10000:10000 \
     -e FLASK_ENV=production \
     -e SECRET_KEY=test-secret \
     royal-equips-orchestrator:latest
   
   # Test
   curl http://localhost:10000/healthz
   ```

3. **Push to Registry**
   ```bash
   docker tag royal-equips-orchestrator:latest \
     ghcr.io/royal-equips-org/royal-equips-orchestrator:latest
   
   docker push ghcr.io/royal-equips-org/royal-equips-orchestrator:latest
   ```

4. **Deploy to Render**
   - New Web Service → Docker
   - Image URL: `ghcr.io/royal-equips-org/royal-equips-orchestrator:latest`
   - Configure environment variables
   - Deploy

---

### Step 2: Frontend Deployment (Cloudflare Pages)

#### 2.1 Build React Application

```bash
cd apps/command-center-ui

# Install dependencies
pnpm install

# Build for production
pnpm run build

# Output will be in: dist/
```

#### 2.2 Deploy to Cloudflare Pages

**Option A: Via Cloudflare Dashboard (Recommended)**

1. **Connect GitHub Repository**
   - Go to https://dash.cloudflare.com
   - Pages → Create a project
   - Connect to Git → Select repository
   - Configure build:
     - Build command: `cd apps/command-center-ui && pnpm install && pnpm run build`
     - Build output directory: `apps/command-center-ui/dist`
     - Root directory: `/` (leave empty)

2. **Set Environment Variables**
   - In Cloudflare Pages project settings
   - Add:
     ```
     VITE_API_BASE_URL=https://command.royalequips.nl
     VITE_API_URL=https://command.royalequips.nl
     ```

3. **Configure Custom Domain**
   - Pages → Your Project → Custom domains
   - Add: `command.royalequips.nl`
   - Cloudflare will automatically configure DNS

4. **Verify _redirects File**
   - Ensure `apps/command-center-ui/public/_redirects` is included in build
   - This file proxies `/api/*` to backend

**Option B: Via Wrangler CLI**

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
cd apps/command-center-ui
wrangler pages deploy dist --project-name=command-center
```

---

### Step 3: Cloudflare Worker Deployment (API Proxy)

**Note:** This is optional if using Cloudflare Pages with `_redirects` file. 
The Worker provides more control over routing.

```bash
# Install dependencies
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to production
wrangler deploy -e production

# Verify deployment
curl https://command.royalequips.nl/health
# Expected: JSON with worker health status
```

**Worker Configuration Check:**
- `wrangler.toml` should have:
  - `UPSTREAM_API_BASE = "https://royal-equips-orchestrator.onrender.com"`
  - Routes configured for `command.royalequips.nl/*`

---

## ✅ Post-Deployment Verification

### 1. Backend Health Checks

```bash
# Basic health
curl https://royal-equips-orchestrator.onrender.com/healthz
# Expected: ok

# Detailed readiness
curl https://royal-equips-orchestrator.onrender.com/readyz
# Expected: JSON with dependencies status

# API endpoint
curl https://royal-equips-orchestrator.onrender.com/api/agents/status
# Expected: JSON with agents array
```

### 2. Frontend Access

```bash
# Via domain
curl -I https://command.royalequips.nl
# Expected: 200 OK, HTML content

# Via Cloudflare Pages
curl -I https://command-center.pages.dev
# Expected: 200 OK, HTML content
```

### 3. API Routing Through Frontend Domain

```bash
# This is the critical test - API calls through frontend domain
curl https://command.royalequips.nl/api/agents/status
# Expected: JSON response (NOT HTML)

# Health check
curl https://command.royalequips.nl/healthz
# Expected: ok

# Detailed health
curl https://command.royalequips.nl/health
# Expected: JSON with system health
```

### 4. WebSocket Connection

```bash
# Test WebSocket endpoint
wscat -c wss://command.royalequips.nl/socket.io/?EIO=4&transport=websocket
# Expected: WebSocket connection established
```

---

## 🐛 Troubleshooting

### Issue: API Returns HTML Instead of JSON

**Symptoms:**
```bash
curl https://command.royalequips.nl/api/agents/status
# Returns: HTML page with React app
```

**Diagnosis:**
1. Check if backend is running:
   ```bash
   curl https://royal-equips-orchestrator.onrender.com/healthz
   ```

2. Check Cloudflare Pages `_redirects` file:
   ```bash
   # Should contain:
   /api/*  https://royal-equips-orchestrator.onrender.com/api/:splat  200
   /*  /index.html  200
   ```

3. Check Cloudflare Worker configuration:
   ```bash
   # Verify wrangler.toml has correct UPSTREAM_API_BASE
   ```

**Solutions:**

A. **If backend is down:**
   - Check Render logs
   - Verify environment variables
   - Check for startup errors

B. **If `_redirects` not working:**
   - Rebuild frontend: `pnpm run build`
   - Verify `_redirects` is in `public/` folder
   - Redeploy to Cloudflare Pages

C. **If Worker misconfigured:**
   - Update `wrangler.toml`
   - Redeploy: `wrangler deploy -e production`

### Issue: WebSocket Connection Fails

**Solution:**
- Render.com requires WebSocket support
- Use `eventlet` worker class in Gunicorn
- Command: `gunicorn --worker-class eventlet -w 1 wsgi:app`

### Issue: 500 Internal Server Error

**Diagnosis:**
1. Check Render logs:
   - Dashboard → royal-equips-orchestrator → Logs

2. Common causes:
   - Missing environment variables (SHOPIFY_API_KEY, etc.)
   - Database connection issues
   - Import errors

**Solution:**
- Review logs for specific error
- Add missing environment variables
- Check for syntax errors in code

### Issue: CORS Errors

**Symptoms:**
```
Access to fetch at 'https://...' from origin 'https://command.royalequips.nl' 
has been blocked by CORS policy
```

**Solution:**
1. Backend already has CORS configured in `app/__init__.py`
2. Verify CORS headers in response:
   ```bash
   curl -H "Origin: https://command.royalequips.nl" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        https://royal-equips-orchestrator.onrender.com/api/agents/status
   ```

---

## 📊 Monitoring & Maintenance

### Health Check Endpoints

Monitor these endpoints for service health:

```bash
# Liveness (is service running?)
GET /healthz
Response: "ok"

# Readiness (is service ready to handle requests?)
GET /readyz
Response: JSON with dependency checks

# Detailed diagnostics
GET /health
Response: JSON with agents, uptime, version
```

### Logs

**Backend (Render):**
- Dashboard → royal-equips-orchestrator → Logs
- Filter by log level: INFO, WARNING, ERROR

**Frontend (Cloudflare Pages):**
- Dashboard → Pages → command-center → Functions logs

**Worker (Cloudflare):**
- Dashboard → Workers & Pages → royal-equips-orchestrator → Logs

### Sentry Error Monitoring

If Sentry is configured:
- Backend errors: https://sentry.io/organizations/royal-equips/issues/
- Frontend errors: Check Sentry React integration

### Performance Monitoring

- **Response Times:** Monitor via Render metrics
- **Error Rates:** Check Sentry or Render logs
- **Resource Usage:** Render Dashboard → Metrics

---

## 🔄 Deployment Updates

### Update Backend

**Auto-deploy (Recommended):**
1. Push to GitHub `master` branch
2. Render automatically deploys
3. Monitor deployment in Render logs

**Manual deploy:**
```bash
# Trigger manual deploy via Render API
curl -X POST https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys \
  -H "Authorization: Bearer $RENDER_API_KEY"
```

### Update Frontend

**Auto-deploy (Recommended):**
1. Push to GitHub `master` branch
2. Cloudflare Pages automatically builds and deploys
3. Monitor deployment in Cloudflare dashboard

**Manual deploy:**
```bash
cd apps/command-center-ui
pnpm run build
wrangler pages deploy dist --project-name=command-center
```

### Update Worker

```bash
wrangler deploy -e production
```

---

## 🔐 Security Checklist

- [ ] All secrets stored in Render environment variables (not in code)
- [ ] HTTPS enforced for all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting enabled (Flask-Limiter)
- [ ] Sentry error monitoring active
- [ ] Cloudflare DDoS protection enabled
- [ ] Regular dependency updates
- [ ] Security headers configured

---

## 📞 Support & Escalation

### Issue Escalation Path

1. **Check logs first:**
   - Render backend logs
   - Cloudflare Pages function logs
   - Cloudflare Worker logs

2. **Verify configuration:**
   - Environment variables
   - DNS settings
   - Worker routes

3. **Test endpoints:**
   - Health checks
   - API responses
   - WebSocket connections

4. **Contact:**
   - GitHub Issues: https://github.com/Royal-Equips-Org/royal-equips-orchestrator/issues
   - Team: @Skidaw23

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Flask Production Best Practices](https://flask.palletsprojects.com/en/latest/deploying/)
