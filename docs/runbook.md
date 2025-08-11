# Royal Equips Orchestrator - Operational Runbook

## Overview

This runbook provides operational procedures for the Royal Equips Orchestrator Flask application in production environments.

## Quick Reference

### Service Endpoints
- **Health Check**: `GET /healthz` (liveness)
- **Readiness Check**: `GET /readyz` (dependencies)  
- **Metrics**: `GET /metrics` (monitoring data)
- **API Documentation**: `GET /docs`
- **Legacy Health**: `GET /health` (backward compatibility)

### Service Configuration
- **Port**: 10000 (production)
- **Workers**: 2 (Gunicorn)
- **Worker Class**: sync (WSGI)
- **Application**: wsgi:app
- **Environment**: production/staging/development

## Health Monitoring

### Liveness Check
```bash
# Quick health check - should return "ok" in <1 second
curl -f http://localhost:10000/healthz

# Expected response
ok
```

### Readiness Check  
```bash
# Comprehensive readiness check with dependency verification
curl -s http://localhost:10000/readyz | jq '.'

# Expected healthy response
{
  "ready": true,
  "status": "healthy", 
  "timestamp": "2025-01-01T12:00:00.000000",
  "checks": [
    {
      "name": "core_service",
      "healthy": true,
      "message": "Service running for 123.4 seconds"
    },
    {
      "name": "shopify_api", 
      "healthy": true,
      "message": "Shopify API connection healthy",
      "required": false
    }
  ]
}
```

### System Metrics
```bash
# Get system metrics and performance data
curl -s http://localhost:10000/metrics | jq '.'

# Key metrics to monitor
{
  "ok": true,
  "backend": "flask",
  "uptime_seconds": 3600.5,
  "total_requests": 1250,
  "total_errors": 3,
  "active_sessions": 5,
  "total_messages": 47
}
```

## Deployment Procedures

### Standard Deployment (Docker)

```bash
# 1. Build new image
docker build -t royal-equips-orchestrator:latest .

# 2. Test image locally
docker run -d --name test-container -p 10000:10000 \
  -e FLASK_ENV=production \
  royal-equips-orchestrator:latest

# 3. Verify health
timeout 30 bash -c 'until curl -f http://localhost:10000/healthz; do sleep 2; done'

# 4. Run smoke tests
./scripts/smoke_test.sh http://localhost:10000

# 5. Deploy to production (replace existing container)
docker stop royal-equips-orchestrator || true
docker rm royal-equips-orchestrator || true
docker run -d --name royal-equips-orchestrator \
  --restart unless-stopped \
  -p 10000:10000 \
  -e FLASK_ENV=production \
  -e PORT=10000 \
  --env-file .env.production \
  royal-equips-orchestrator:latest

# 6. Verify deployment
curl -f http://localhost:10000/healthz
curl -f http://localhost:10000/readyz
```

### Render Deployment

```bash
# Automatic deployment via GitHub
git push origin main

# Manual trigger via API
curl -X POST https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys \
  -H "Authorization: Bearer $RENDER_API_KEY"

# Monitor deployment
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys
```

### Rollback Procedure

```bash
# 1. Quick rollback to previous Docker image
docker stop royal-equips-orchestrator
docker rm royal-equips-orchestrator
docker run -d --name royal-equips-orchestrator \
  --restart unless-stopped \
  -p 10000:10000 \
  -e FLASK_ENV=production \
  --env-file .env.production \
  royal-equips-orchestrator:previous

# 2. Verify rollback
curl -f http://localhost:10000/healthz

# 3. For Render: trigger deploy of previous commit
# (Use Render dashboard or API to deploy specific commit)
```

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check Docker logs
docker logs royal-equips-orchestrator

# Common causes:
# - Missing environment variables
# - Port already in use
# - Configuration errors

# Debug startup
docker run -it --rm -p 10000:10000 \
  -e FLASK_ENV=development \
  royal-equips-orchestrator:latest \
  python wsgi.py
```

#### Health Checks Failing
```bash
# Check readiness endpoint for specific failures
curl -s http://localhost:10000/readyz | jq '.checks[] | select(.healthy == false)'

# Common dependency failures:
# - External API timeouts (Shopify, GitHub)
# - Network connectivity issues
# - Authentication failures

# Check circuit breaker states
curl -s http://localhost:10000/readyz | jq '.checks[] | {name, circuit_state}'
```

#### High Error Rates
```bash
# Check error metrics
curl -s http://localhost:10000/metrics | jq '{total_requests, total_errors, error_rate: (.total_errors / .total_requests * 100)}'

# Check application logs
docker logs royal-equips-orchestrator --tail 100

# Look for patterns in errors:
# - Validation errors (400s)
# - External API failures (502/503)
# - Application errors (500s)
```

#### Performance Issues
```bash
# Check system metrics
curl -s http://localhost:10000/metrics | jq '{uptime_seconds, active_sessions, total_requests}'

# Monitor resource usage
docker stats royal-equips-orchestrator

# Check worker status (if using multiple workers)
ps aux | grep gunicorn
```

### Debugging Commands

#### Application State
```bash
# Get current configuration
curl -s http://localhost:10000/metrics | jq '.system'

# List active agent sessions
curl -s http://localhost:10000/agents/sessions | jq '.total'

# Check background jobs
curl -s http://localhost:10000/jobs | jq '.jobs[] | {name, status}'
```

#### Network Connectivity
```bash
# Test external dependencies from container
docker exec royal-equips-orchestrator curl -f https://api.github.com/rate_limit
docker exec royal-equips-orchestrator nslookup api.shopify.com
```

#### Performance Profiling
```bash
# Enable debug logging
docker restart royal-equips-orchestrator \
  -e FLASK_ENV=development \
  -e LOG_LEVEL=DEBUG

# Monitor response times
curl -w "@curl-format.txt" -s http://localhost:10000/healthz

# curl-format.txt:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

## Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Health Check** | Response time > 5s | Investigate performance |
| **Error Rate** | > 5% of total requests | Check logs, rollback if needed |
| **Readiness** | Any dependency failing | Check external services |
| **Memory Usage** | > 80% container memory | Scale or optimize |
| **Response Time** | > 2s for /healthz | Performance investigation |
| **Active Sessions** | > 100 concurrent | Consider scaling |

### Alerting Setup (Example)

```bash
# Healthcheck monitoring script
#!/bin/bash
if ! curl -f --max-time 10 http://localhost:10000/healthz > /dev/null 2>&1; then
    echo "ALERT: Health check failed"
    # Send to monitoring system (e.g., PagerDuty, Slack)
fi

# Readiness monitoring
if ! curl -s http://localhost:10000/readyz | jq -e '.ready == true' > /dev/null; then
    echo "ALERT: Service not ready"
    # Send alert with dependency details
fi
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor error rates and response times
- Check system metrics for anomalies
- Verify all health checks are passing

#### Weekly  
- Review application logs for patterns
- Update dependencies if security patches available
- Run full smoke test suite

#### Monthly
- Performance review and optimization
- Backup configuration and secrets
- Review and update monitoring thresholds
- Security audit of dependencies

### Updates and Patches

```bash
# 1. Security updates
pip list --outdated
pip install --upgrade package_name

# 2. Build new image
docker build -t royal-equips-orchestrator:v2.1.0 .

# 3. Test thoroughly
./scripts/smoke_test.sh http://localhost:10000

# 4. Deploy with proper versioning
docker tag royal-equips-orchestrator:v2.1.0 royal-equips-orchestrator:latest
```

### Backup and Recovery

#### Configuration Backup
```bash
# Backup environment configuration
cp .env.production .env.production.backup.$(date +%Y%m%d)

# Backup Docker configuration
docker inspect royal-equips-orchestrator > container-config.$(date +%Y%m%d).json
```

#### Data Recovery
```bash
# Since application is stateless, recovery focuses on configuration
# 1. Restore environment variables
# 2. Deploy known good image
# 3. Verify all integrations work
# 4. Run smoke tests
```

## Security

### Security Checklist

- [ ] Environment variables properly secured
- [ ] No secrets in logs or error messages
- [ ] External API credentials rotated regularly
- [ ] HTTPS enforced in production
- [ ] CORS properly configured per environment
- [ ] Input validation on all endpoints
- [ ] Error responses don't leak sensitive information

### Incident Response

#### Security Incident
1. **Immediate**: Isolate affected components
2. **Assess**: Determine scope and impact
3. **Contain**: Block malicious traffic if needed
4. **Recover**: Deploy clean version
5. **Learn**: Update security measures

#### Data Breach Response
1. **Stop**: Immediately halt affected services
2. **Assess**: Determine what data was accessed
3. **Notify**: Follow legal and contractual requirements
4. **Remediate**: Fix vulnerability, rotate credentials
5. **Monitor**: Enhanced monitoring post-incident

## Performance Tuning

### Optimization Options

#### Application Level
- Adjust Gunicorn worker count based on CPU cores
- Enable response caching for static data
- Implement connection pooling for external APIs
- Add request rate limiting

#### Infrastructure Level
- Scale horizontally with load balancer
- Use Redis for session storage
- Implement CDN for static assets
- Add application-level caching

#### Configuration Tuning
```bash
# Production Gunicorn configuration
gunicorn --bind 0.0.0.0:10000 \
  --workers $((2 * $(nproc) + 1)) \
  --worker-class sync \
  --max-requests 1000 \
  --max-requests-jitter 50 \
  --timeout 30 \
  --keepalive 5 \
  --access-logfile - \
  --error-logfile - \
  wsgi:app
```

This runbook should be updated as the system evolves and new operational patterns emerge.