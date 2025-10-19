# Production Deployment Guide - Royal Equips Orchestrator

**Version:** 2.0  
**Last Updated:** 2025-01-19  
**Status:** Production-Ready with Autonomous Self-Healing

## Overview

This guide covers the complete deployment process for the Royal Equips Orchestrator, including all production requirements, credential management, health monitoring, and operational procedures.

## Prerequisites

### Required Credentials (CRITICAL)

The orchestrator will NOT start without these credentials. Set them as environment variables or secrets in your deployment platform.

#### E-Commerce Platform (REQUIRED)
```bash
SHOPIFY_STORE=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
AUTO_DS_API_KEY=your_autods_key
SPOCKET_API_KEY=your_spocket_key
```

#### AI Services (REQUIRED)
```bash
OPENAI_API_KEY=sk-xxxxx
```

#### Flask Configuration (REQUIRED)
```bash
SECRET_KEY=<strong-random-key-min-32-chars>
FLASK_ENV=production
PORT=10000
HOST=0.0.0.0
```

#### Optional but Recommended
```bash
# Marketing & Communications
KLAVIYO_API_KEY=pk_xxxxx
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx

# Fulfillment
PRINTFUL_API_KEY=xxxxx

# Database & Caching
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=xxxxx
REDIS_URL=redis://xxxxx

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### System Requirements

- **Python:** 3.11 or higher
- **Node.js:** 18+ (for frontend build)
- **Memory:** Minimum 2GB RAM, 4GB recommended
- **Storage:** 10GB available disk space
- **Network:** Outbound HTTPS access to external APIs

## Deployment Platforms

### Option 1: Render (Recommended)

1. **Backend Deployment:**
```yaml
# render.yaml
services:
  - type: web
    name: royal-equips-orchestrator
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn -w 4 -b 0.0.0.0:10000 wsgi:app
    envVars:
      - key: FLASK_ENV
        value: production
    healthCheckPath: /healthz
```

2. **Environment Variables:**
   - Set all required credentials in Render dashboard
   - Use Secret Files for sensitive data

3. **Deploy:**
```bash
# Automatic deployment from main branch
git push origin main
```

### Option 2: Docker Deployment

1. **Build Image:**
```bash
docker build -t royal-equips-orchestrator:latest .
```

2. **Run Container:**
```bash
docker run -d \
  --name royal-equips \
  -p 10000:10000 \
  --env-file .env.production \
  --restart unless-stopped \
  royal-equips-orchestrator:latest
```

3. **Docker Compose:**
```yaml
version: '3.8'
services:
  orchestrator:
    build: .
    ports:
      - "10000:10000"
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:10000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Option 3: Cloudflare Workers (Frontend Only)

1. **Build Frontend:**
```bash
cd apps/command-center-ui
pnpm install
pnpm run build
```

2. **Deploy to Cloudflare Pages:**
```bash
wrangler pages deploy dist --project-name=royal-equips-ui
```

3. **Set Environment Variables:**
```bash
VITE_API_BASE_URL=https://your-backend.onrender.com
```

## Pre-Deployment Validation

### Step 1: Run Production Validator Locally

```bash
# Set production environment
export FLASK_ENV=production

# Load credentials
source .env.production

# Run validator
python3 << 'EOF'
from core.production_validator import validate_production_environment

if validate_production_environment(strict_mode=True):
    print("✅ All validations passed - ready to deploy")
else:
    print("❌ Validation failed - check logs above")
    exit(1)
EOF
```

### Step 2: Run Tests

```bash
# Install dependencies
make setup

# Run linting
make lint

# Run tests
make test

# Run full CI pipeline locally
make ci
```

### Step 3: Build and Test Locally

```bash
# Test Flask app
python wsgi.py

# In another terminal, test endpoints
curl http://localhost:10000/healthz
curl http://localhost:10000/validate
curl http://localhost:10000/api/empire/metrics
```

## Deployment Process

### Backend Deployment

1. **Merge to Main Branch:**
```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

2. **Monitor Deployment:**
   - Check deployment logs in your platform dashboard
   - Watch for "Royal Equips Flask Orchestrator initialized successfully"
   - Verify no error messages related to credentials

3. **Verify Health Endpoints:**
```bash
# Liveness check
curl https://your-backend.onrender.com/healthz
# Expected: {"status": "healthy"}

# Readiness check
curl https://your-backend.onrender.com/readyz
# Expected: {"ready": true, ...}

# Validation check
curl https://your-backend.onrender.com/validate
# Expected: {"passed": true, ...}
```

4. **Verify Agent Initialization:**
```bash
# Check agent status
curl https://your-backend.onrender.com/api/empire/agents
# Expected: List of active agents with status
```

### Frontend Deployment

1. **Build Static Assets:**
```bash
cd apps/command-center-ui
pnpm install
pnpm run build
```

2. **Deploy to Platform:**

**Cloudflare Pages:**
```bash
wrangler pages deploy dist --project-name=royal-equips-ui
```

**Vercel:**
```bash
vercel --prod
```

**Netlify:**
```bash
netlify deploy --prod --dir=dist
```

3. **Configure Environment:**
   - Set `VITE_API_BASE_URL` to backend URL
   - Enable CORS on backend for frontend domain

## Post-Deployment Verification

### Health Checks

1. **Backend Health:**
```bash
# Should return 200 OK
curl -I https://your-backend.onrender.com/healthz

# Should return detailed status
curl https://your-backend.onrender.com/readyz | jq
```

2. **Frontend Health:**
   - Navigate to https://your-frontend.pages.dev
   - Check browser console for errors
   - Verify API calls succeed (Network tab)

3. **Agent Status:**
```bash
# Get all agent status
curl https://your-backend.onrender.com/api/empire/agents | jq

# Expected output:
# {
#   "agents": [
#     {"name": "product_research", "status": "active", ...},
#     {"name": "order_fulfillment", "status": "active", ...}
#   ]
# }
```

### Functional Tests

1. **Product Research Agent:**
```bash
curl -X POST https://your-backend.onrender.com/api/empire/agents/product_research/execute \
  -H "Content-Type: application/json" \
  -d '{
    "categories": ["electronics"],
    "maxProducts": 10,
    "minMargin": 30
  }'
```

2. **Order Fulfillment:**
   - Place a test order in Shopify
   - Verify agent processes it
   - Check logs for successful routing

3. **Marketing Automation:**
   - Trigger a campaign
   - Verify emails sent
   - Check campaign metrics

### Monitoring Setup

1. **Sentry Integration:**
```bash
# Verify Sentry is receiving events
curl https://your-backend.onrender.com/api/test-sentry

# Check Sentry dashboard for event
```

2. **Prometheus Metrics:**
```bash
# Access metrics endpoint
curl https://your-backend.onrender.com/metrics

# Expected: Prometheus-formatted metrics
```

3. **Circuit Breaker Status:**
```bash
# Get circuit breaker metrics
curl https://your-backend.onrender.com/api/circuit-breakers | jq
```

## Rollback Procedures

### Immediate Rollback

If critical issues occur:

1. **Revert to Previous Version:**
```bash
# Revert Git commit
git revert HEAD
git push origin main

# Or restore from backup
git reset --hard <previous-commit-sha>
git push -f origin main
```

2. **Platform-Specific Rollback:**

**Render:**
- Go to dashboard → Select service → Click "Rollback" button
- Select previous successful deployment

**Docker:**
```bash
docker stop royal-equips
docker rm royal-equips
docker run -d --name royal-equips \
  <previous-image-tag>
```

3. **Verify Rollback:**
```bash
curl https://your-backend.onrender.com/healthz
```

### Gradual Rollback

For non-critical issues:

1. **Disable Problematic Agent:**
```bash
curl -X POST https://your-backend.onrender.com/api/empire/agents/product_research/disable
```

2. **Monitor Impact:**
   - Check error rates
   - Verify other agents functioning
   - Review logs

3. **Fix and Redeploy:**
   - Fix the issue locally
   - Test thoroughly
   - Deploy fix

## Operational Procedures

### Daily Operations

1. **Morning Health Check:**
```bash
# Run automated health check script
./scripts/health-check.sh
```

2. **Review Metrics:**
   - Open monitoring dashboard
   - Check agent success rates
   - Review error logs
   - Verify circuit breaker states

3. **Check Dead Letter Queues:**
```bash
# View failed operations
curl https://your-backend.onrender.com/api/dlq/product_research_failures
```

### Weekly Maintenance

1. **Review Circuit Breaker Metrics:**
```bash
curl https://your-backend.onrender.com/api/circuit-breakers | jq
```

2. **Check Credential Expiration:**
   - Review API key expiration dates
   - Rotate secrets as needed
   - Update environment variables

3. **Performance Analysis:**
   - Review response times
   - Check API rate limit usage
   - Optimize slow operations

### Monthly Audits

1. **Security Audit:**
   - Review access logs
   - Check for unauthorized access attempts
   - Update dependencies with security patches

2. **Cost Optimization:**
   - Review API usage costs
   - Optimize inefficient agents
   - Scale resources as needed

3. **Compliance Review:**
   - Verify GDPR compliance
   - Check PCI DSS requirements
   - Review data retention policies

## Troubleshooting

### Agent Not Starting

**Symptom:** Agent shows "ERROR" or "INACTIVE" status

**Solutions:**
1. Check credentials validation:
```bash
curl https://your-backend.onrender.com/validate
```

2. Review logs for error messages
3. Verify API keys are valid
4. Check network connectivity to external APIs

### Circuit Breaker Open

**Symptom:** "Circuit breaker is OPEN" errors

**Solutions:**
1. Check circuit breaker status:
```bash
curl https://your-backend.onrender.com/api/circuit-breakers
```

2. Investigate why API is failing
3. Wait for timeout (default: 60s)
4. Or manually reset:
```bash
curl -X POST https://your-backend.onrender.com/api/circuit-breakers/reset
```

### High Error Rate

**Symptom:** Many failed operations in logs

**Solutions:**
1. Check dead letter queue:
```bash
curl https://your-backend.onrender.com/api/dlq
```

2. Identify common error patterns
3. Fix underlying issue
4. Retry failed operations

### Performance Degradation

**Symptom:** Slow response times, timeouts

**Solutions:**
1. Check resource usage:
```bash
curl https://your-backend.onrender.com/api/metrics
```

2. Scale up resources if needed
3. Optimize database queries
4. Enable caching (Redis)

## Security Best Practices

1. **Never commit secrets to Git**
   - Use environment variables
   - Use secrets management systems
   - Rotate credentials regularly

2. **Enable HTTPS only**
   - No HTTP in production
   - Use TLS 1.2 or higher
   - Valid SSL certificates

3. **Implement rate limiting**
   - Already configured in circuit breakers
   - Adjust limits as needed
   - Monitor for abuse

4. **Regular security updates**
```bash
# Update dependencies
pip install --upgrade -r requirements.txt

# Check for vulnerabilities
pip-audit
```

5. **Access Control**
   - Restrict admin endpoints
   - Use API keys for authentication
   - Implement RBAC where possible

## Support and Escalation

### Getting Help

1. **Check Documentation:**
   - This deployment guide
   - `docs/RUNBOOK.md` for operations
   - `AGENT_INSTRUCTIONS.md` for agent details

2. **Review Logs:**
   - Application logs
   - Sentry error tracking
   - Platform deployment logs

3. **Contact Channels:**
   - GitHub Issues: Technical problems
   - Slack/Discord: Real-time support
   - Email: Priority incidents

### Escalation Path

1. **Level 1:** Self-service (docs, logs, health checks)
2. **Level 2:** Team member review
3. **Level 3:** Senior engineer escalation
4. **Level 4:** Emergency on-call (critical issues only)

## Appendix

### Environment Variable Reference

See `.env.example` for complete list of environment variables.

### API Endpoints Reference

- `/healthz` - Liveness probe
- `/readyz` - Readiness probe
- `/validate` - Credential validation
- `/metrics` - Prometheus metrics
- `/api/empire/agents` - Agent status
- `/api/empire/metrics` - Business metrics
- `/api/circuit-breakers` - Circuit breaker status
- `/api/dlq` - Dead letter queues

### Monitoring Dashboards

- **Sentry:** https://sentry.io/royal-equips
- **Render:** https://dashboard.render.com
- **Cloudflare:** https://dash.cloudflare.com
- **Prometheus/Grafana:** (if configured)

### Related Documentation

- [RUNBOOK.md](./RUNBOOK.md) - Operational procedures
- [STACK_REPORT.md](../reports/STACK_REPORT.md) - System architecture
- [AGENT_INSTRUCTIONS.md](../AGENT_INSTRUCTIONS.md) - Agent development
- [SENTRY_INTEGRATION.md](../SENTRY_INTEGRATION.md) - Error tracking setup

---

**Last Reviewed:** 2025-01-19  
**Next Review:** 2025-02-19  
**Owner:** Platform Engineering Team
