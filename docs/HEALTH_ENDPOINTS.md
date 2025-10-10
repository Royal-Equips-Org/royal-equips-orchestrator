# Health Endpoints Documentation

## Overview

The Royal Equips Orchestrator provides comprehensive health check endpoints for monitoring service availability and readiness. All endpoints return JSON responses with appropriate HTTP status codes.

## Endpoint Reference

### `GET /health`

**Purpose:** Comprehensive health diagnostics with service information.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "Royal Equips API",
  "version": "1.0.0-dev",
  "timestamp": "2025-10-05T15:00:00.000Z",
  "uptime": 12345,
  "permissions": {
    "contents": "read",
    "issues": "write",
    "pullRequests": "write",
    "actions": "read"
  }
}
```

**Rate Limit:** 30 requests per minute

**Use Case:** General health monitoring, status dashboards

---

### `GET /healthz`

**Purpose:** Kubernetes-style liveness probe. Indicates the service is running and responsive.

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T15:00:00.000Z",
  "uptime": 12345,
  "service": "Royal Equips API"
}
```

**Rate Limit:** 20 requests per minute

**Use Case:** Kubernetes liveness probes, Docker health checks

**Health Check Configuration:**
```yaml
# Kubernetes
livenessProbe:
  httpGet:
    path: /healthz
    port: 10000
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3

# Docker Compose
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:10000/healthz"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

---

### `GET /readyz`

**Purpose:** Kubernetes-style readiness probe with comprehensive dependency checks.

**Response (200 OK - Service Ready):**
```json
{
  "status": "ok",
  "service": "Royal Equips API",
  "version": "1.0.0-dev",
  "timestamp": "2025-10-05T15:00:00.000Z",
  "uptime": 12345,
  "dependencies": [
    {
      "name": "environment",
      "status": "ok",
      "latency": 0,
      "details": {
        "node_env": "production",
        "port": "10000",
        "release": "v1.0.0"
      }
    },
    {
      "name": "memory",
      "status": "ok",
      "latency": 0,
      "details": {
        "rss": 79,
        "heapTotal": 15,
        "heapUsed": 14,
        "external": 3,
        "heap_used_percentage": 93
      }
    },
    {
      "name": "filesystem",
      "status": "ok",
      "latency": 0,
      "details": {
        "web_root": "/app/dist-web",
        "web_root_exists": true
      }
    },
    {
      "name": "runtime",
      "status": "ok",
      "latency": 0,
      "details": {
        "node_version": "v20.19.5",
        "platform": "linux",
        "arch": "x64",
        "uptime_seconds": 46,
        "pid": 2191
      }
    }
  ],
  "permissions": {
    "contents": "read",
    "issues": "write",
    "pullRequests": "write",
    "actions": "read"
  },
  "check_duration_ms": 2
}
```

**Response (503 Service Unavailable - Not Ready):**
```json
{
  "status": "error",
  "service": "Royal Equips API",
  "version": "1.0.0-dev",
  "timestamp": "2025-10-05T15:00:00.000Z",
  "uptime": 12345,
  "dependencies": [
    {
      "name": "environment",
      "status": "error",
      "latency": 0,
      "error": "Missing required environment variables: NODE_ENV",
      "details": {
        "missing_required": ["NODE_ENV"],
        "missing_optional": ["PORT"]
      }
    }
  ]
}
```

**Rate Limit:** 10 requests per minute

**Use Case:** Kubernetes readiness probes, load balancer health checks

**Health Check Configuration:**
```yaml
# Kubernetes
readinessProbe:
  httpGet:
    path: /readyz
    port: 10000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

---

### `GET /liveness` (Alias)

**Purpose:** Alternative endpoint for `/healthz`. Provided for compatibility with systems that prefer the `/liveness` naming convention.

**Response:** Identical to `/healthz`

**Rate Limit:** 20 requests per minute

---

### `GET /readiness` (Alias)

**Purpose:** Alternative endpoint for `/readyz`. Simplified readiness check.

**Response (200 OK):**
```json
{
  "ready": true,
  "status": "ok",
  "service": "Royal Equips API",
  "version": "1.0.0-dev",
  "timestamp": "2025-10-05T15:00:00.000Z",
  "checks": [
    {
      "name": "service",
      "status": "ok",
      "latency": 0,
      "details": {
        "service": "Royal Equips API"
      }
    }
  ],
  "uptime": 12345,
  "check_duration_ms": 0
}
```

**Rate Limit:** 10 requests per minute

---

## Backward Compatibility

All health endpoints are also available under the `/v1/` prefix for backward compatibility:

- `/v1/health` - Same as `/health`
- `/v1/healthz` - Same as `/healthz`
- `/v1/readyz` - Same as `/readyz`

## Routing Configuration

### Development Mode

During development, Vite dev server proxies health endpoints to the backend:

```typescript
// vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/health': { target: 'http://localhost:10000', changeOrigin: true },
    '/healthz': { target: 'http://localhost:10000', changeOrigin: true },
    '/readyz': { target: 'http://localhost:10000', changeOrigin: true },
    '/liveness': { target: 'http://localhost:10000', changeOrigin: true },
    '/readiness': { target: 'http://localhost:10000', changeOrigin: true }
  }
}
```

### Production Deployment

#### Cloudflare Workers Proxy

The Cloudflare Workers proxy (`workers/api-proxy.ts`) forwards health endpoints to the upstream backend:

```typescript
// Health endpoints are proxied to UPSTREAM_API_BASE
app.get('/health', async (c) => {
  const upstreamApiBase = c.env.UPSTREAM_API_BASE;
  const targetUrl = new URL('/health', upstreamApiBase);
  const response = await fetch(targetUrl.toString(), {
    headers: { 'Accept': 'application/json' }
  });
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
});
```

**Environment Variables:**
- `UPSTREAM_API_BASE`: Backend URL (e.g., `https://aira.internal:10000`)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins

#### Direct Proxy

The simple Cloudflare proxy (`cloudflare-proxy/worker.js`) forwards all requests to the upstream backend:

```javascript
// Sets Accept: application/json for health endpoints
const isHealthEndpoint = url.pathname === '/health' || 
                         url.pathname === '/healthz' || 
                         url.pathname === '/readyz';

if (isHealthEndpoint && request.method === 'GET') {
  headers.set('Accept', 'application/json');
}
```

## Testing

### Manual Testing

Run the integration test script:

```bash
cd apps/api
npm run dev  # Start server in another terminal
./test-health-endpoints.sh
```

### Automated Testing

Health endpoint tests are included in `apps/api/src/v1/health.test.ts`. To run (requires Jest setup):

```bash
cd apps/api
npm test
```

### Testing with curl

```bash
# Basic health check
curl http://localhost:10000/health | jq

# Liveness probe
curl http://localhost:10000/healthz | jq

# Readiness probe
curl http://localhost:10000/readyz | jq

# Test with HTML accept header (should still return JSON)
curl -H "Accept: text/html" http://localhost:10000/health | jq
```

## Troubleshooting

### Issue: Health endpoints return HTML instead of JSON

**Symptoms:**
- Health check requests receive HTML response (typically Vite's `index.html`)
- Content-Type is `text/html` instead of `application/json`
- Response contains `<!DOCTYPE html>` or `<html>` tags

**Causes:**
1. Health routes not registered at root level
2. SPA fallback handler catching health endpoint requests
3. Proxy misconfiguration

**Solution:**
Ensure health routes are registered before static file serving and SPA fallback:

```typescript
// apps/api/src/server.ts
// 1. Register health endpoints at root level FIRST
const healthRoutes = await import("./v1/health.js");
await app.register(healthRoutes.default);

// 2. Then register other API routes
app.register(api, { prefix: "/v1" });

// 3. Finally, configure SPA fallback with exclusions
app.setNotFoundHandler(async (req, reply) => {
  const isApiRoute = path.startsWith('/v1/') || 
                     path.startsWith('/api/') || 
                     path === '/health' || 
                     path === '/healthz' || 
                     path === '/readyz';
  
  if (req.method === "GET" && accept.includes("text/html") && !isApiRoute) {
    return (reply as any).sendFile("index.html");
  }
  reply.code(404).send({ error: "not_found" });
});
```

### Issue: 503 Service Unavailable on /readyz

**Symptoms:**
- `/readyz` returns HTTP 503 with error status
- Dependency checks show failed status

**Expected Behavior:**
This is normal! `/readyz` returns 503 when the service is not ready to accept traffic. Check the `dependencies` array in the response to identify which checks failed.

**Common Causes:**
- Missing required environment variables (`NODE_ENV`)
- Filesystem access issues (web root doesn't exist)
- Database connection failures
- External service unavailable

**Solution:**
Review the `dependencies` array and fix the reported issues:

```json
{
  "status": "error",
  "dependencies": [
    {
      "name": "environment",
      "status": "error",
      "error": "Missing required environment variables: NODE_ENV"
    }
  ]
}
```

Set the required environment variables:
```bash
export NODE_ENV=production
export PORT=10000
```

## Monitoring Best Practices

### Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: royal-equips-api
spec:
  containers:
  - name: api
    image: royal-equips/api:latest
    ports:
    - containerPort: 10000
    livenessProbe:
      httpGet:
        path: /healthz
        port: 10000
      initialDelaySeconds: 10
      periodSeconds: 30
      timeoutSeconds: 5
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /readyz
        port: 10000
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
```

### Docker Compose

```yaml
services:
  api:
    image: royal-equips/api:latest
    ports:
      - "10000:10000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:10000/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### Prometheus Monitoring

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'royal-equips-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:10000']
    scrape_interval: 30s
```

### Uptime Monitoring

Recommended services:
- **UptimeRobot**: Monitor `/health` endpoint every 5 minutes
- **Pingdom**: Monitor `/healthz` for liveness
- **Datadog**: Synthetic tests for `/readyz` with dependency validation
- **New Relic**: Custom health check scripts

## Related Documentation

- [API Documentation](../docs/openapi/royalgpt-command-api.yaml)
- [Deployment Guide](../docs/RUNBOOK.md)
- [Architecture Overview](../docs/architecture.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)

## Support

For issues or questions:
1. Check this documentation
2. Review [GitHub Issues](https://github.com/Royal-Equips-Org/royal-equips-orchestrator/issues)
3. Contact the DevOps team
4. Create a new issue with the `health-check` label
