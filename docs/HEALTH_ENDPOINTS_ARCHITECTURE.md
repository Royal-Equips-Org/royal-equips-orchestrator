# Health Endpoints Architecture

## Request Flow Diagram

### Before Fix (❌ Broken)

```
User Request: GET /health
  ↓
[Cloudflare Worker/Proxy]
  ↓ (forwards request)
[Fastify Server]
  ↓
[Route Registration]
  - /v1/health ✓ (registered under /v1 prefix)
  - /health ✗ (not registered at root)
  ↓
[404 Not Found]
  ↓
[setNotFoundHandler]
  - Checks: req.method === "GET" && accept.includes("text/html")
  - Result: TRUE (browser sends Accept: text/html)
  ↓
[Returns index.html] ❌
  ↓
User receives: <!DOCTYPE html>...
```

**Problem:** Health endpoints fall through to SPA handler, returning HTML instead of JSON.

---

### After Fix (✅ Working)

```
User Request: GET /health
  ↓
[Cloudflare Worker/Proxy]
  - Sets Accept: application/json for health endpoints
  ↓ (forwards request with JSON accept header)
[Fastify Server]
  ↓
[Route Registration] (Order matters!)
  1. Health routes registered at ROOT level ✓
     - /health
     - /healthz
     - /readyz
     - /liveness
     - /readiness
  2. API routes registered under /v1 prefix
     - /v1/health (also available)
     - /v1/...other routes
  3. Static file serving
  4. SPA fallback (with exclusions)
  ↓
[Route Match: /health] ✓
  ↓
[Health Route Handler]
  - Returns JSON with 200 status
  - Content-Type: application/json
  ↓
User receives: {"status":"ok",...} ✅
```

---

## Routing Priority

The order of route registration is critical:

```typescript
// 1. FIRST: Register health endpoints at root level
const healthRoutes = await import("./v1/health.js");
await app.register(healthRoutes.default);

// 2. SECOND: Register API routes under /v1 prefix
app.register(api, { prefix: "/v1" });

// 3. THIRD: Serve static files
await app.register(fastifyStatic, {
  root: webRoot,
  prefix: "/"
});

// 4. LAST: SPA fallback with exclusions
app.setNotFoundHandler(async (req, reply) => {
  const isApiRoute = path.startsWith('/v1/') || 
                     path.startsWith('/api/') || 
                     path === '/health' || 
                     path === '/healthz' || 
                     path === '/readyz' ||
                     path === '/liveness' ||
                     path === '/readiness';
  
  if (req.method === "GET" && accept.includes("text/html") && !isApiRoute) {
    return reply.sendFile("index.html");
  }
  reply.code(404).send({ error: "not_found" });
});
```

## Multi-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser/Tool)                    │
│                  GET /health, /healthz, /readyz              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers Proxy                  │
│  - Detects health endpoint requests                          │
│  - Sets Accept: application/json header                      │
│  - Forwards to UPSTREAM_API_BASE                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Fastify API Server                      │
│                        (Port 10000)                          │
│                                                               │
│  [Request Router]                                            │
│    ├─ /health         → Health Handler (root level)         │
│    ├─ /healthz        → Liveness Handler (root level)       │
│    ├─ /readyz         → Readiness Handler (root level)      │
│    ├─ /liveness       → Liveness Alias (root level)         │
│    ├─ /readiness      → Readiness Alias (root level)        │
│    ├─ /v1/*           → API Routes (v1 prefix)              │
│    ├─ /static/*       → Static Files                        │
│    └─ /*              → SPA Fallback (excluded routes)      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        JSON Response                         │
│  {                                                           │
│    "status": "ok",                                           │
│    "service": "Royal Equips API",                            │
│    "timestamp": "2025-10-05T15:00:00.000Z",                  │
│    "uptime": 12345                                           │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Development vs Production

### Development Mode (Vite Dev Server)

```
[Browser] → [Vite Dev Server :3000]
                  │
                  ├─ /health → Proxy to localhost:10000/health
                  ├─ /healthz → Proxy to localhost:10000/healthz
                  ├─ /readyz → Proxy to localhost:10000/readyz
                  ├─ /v1/* → Proxy to localhost:10000/v1/*
                  └─ /* → Serve React SPA
                  
[Vite Proxy] → [Fastify :10000] → JSON Response
```

**Configuration:** `apps/command-center-ui/vite.config.ts`

### Production Mode (Single Server)

```
[Browser] → [Fastify :10000]
                  │
                  ├─ /health → Health Handler → JSON
                  ├─ /healthz → Liveness Handler → JSON
                  ├─ /readyz → Readiness Handler → JSON
                  ├─ /v1/* → API Routes → JSON
                  └─ /* → Static Files (built React app)
```

**Configuration:** `apps/api/src/server.ts`

### Production Mode (with Cloudflare)

```
[Browser] → [Cloudflare Workers] → [Fastify :10000]
                  │                      │
                  │                      ├─ /health → JSON
                  │                      ├─ /healthz → JSON
                  │                      └─ /readyz → JSON
                  │
                  └─ Sets Accept: application/json
                     Forwards to UPSTREAM_API_BASE
```

**Configuration:** 
- `workers/api-proxy.ts` (advanced proxy with /api/* handling)
- `cloudflare-proxy/worker.js` (simple passthrough proxy)

## Health Check Flow

### 1. Basic Health Check (/health)

```
GET /health
  ↓
[Health Handler]
  ↓
[Check Service Uptime]
  ↓
[Return Status]
  {
    "status": "ok",
    "uptime": 12345,
    "version": "1.0.0",
    "service": "Royal Equips API"
  }
```

### 2. Liveness Probe (/healthz, /liveness)

```
GET /healthz
  ↓
[Liveness Handler]
  ↓
[Check if Process is Alive]
  - Can the server respond?
  ↓
[Return Status]
  HTTP 200: Service is alive
  HTTP 503: Service is dead
```

### 3. Readiness Probe (/readyz, /readiness)

```
GET /readyz
  ↓
[Readiness Handler]
  ↓
[Check Dependencies]
  ├─ Environment Variables
  ├─ Memory Status
  ├─ Filesystem Access
  ├─ Database Connection (if required)
  └─ External Services (optional)
  ↓
[Aggregate Status]
  All OK → HTTP 200 {"status": "ok", "ready": true}
  Any Error → HTTP 503 {"status": "error", "ready": false}
  ↓
[Return Detailed Report]
  {
    "ready": true/false,
    "status": "ok|degraded|error",
    "dependencies": [
      {"name": "environment", "status": "ok"},
      {"name": "memory", "status": "ok"},
      ...
    ]
  }
```

## Error Prevention Strategy

To prevent similar issues in the future, the fix includes:

### 1. **Explicit Route Registration Order**
```typescript
// Health routes MUST be registered BEFORE static file serving
await app.register(healthRoutes.default);  // 1st
app.register(api, { prefix: "/v1" });      // 2nd
await app.register(fastifyStatic, ...);    // 3rd
app.setNotFoundHandler(...);               // 4th (last)
```

### 2. **SPA Fallback Exclusion List**
```typescript
const isApiRoute = path.startsWith('/v1/') || 
                   path.startsWith('/api/') || 
                   path === '/health' || 
                   path === '/healthz' || 
                   path === '/readyz' ||
                   path === '/liveness' ||
                   path === '/readiness' ||
                   path === '/version' ||
                   path === '/metrics';
```

### 3. **Proxy Configuration**
```typescript
// Vite proxy ensures health endpoints reach backend
proxy: {
  '/health': { target: 'http://localhost:10000' },
  '/healthz': { target: 'http://localhost:10000' },
  '/readyz': { target: 'http://localhost:10000' }
}
```

### 4. **Cloudflare Worker Headers**
```javascript
// Force JSON Accept header for health endpoints
if (isHealthEndpoint && request.method === 'GET') {
  headers.set('Accept', 'application/json');
}
```

### 5. **Comprehensive Testing**
- Integration test script: `apps/api/test-health-endpoints.sh`
- Unit tests: `apps/api/src/v1/health.test.ts`
- Documentation: `docs/HEALTH_ENDPOINTS.md`

## Deployment Checklist

When deploying changes, verify:

- [ ] Health endpoints return JSON (not HTML)
- [ ] Content-Type header is `application/json`
- [ ] Status codes are appropriate (200 for ok, 503 for not ready)
- [ ] Rate limiting is working
- [ ] All five endpoints respond: `/health`, `/healthz`, `/readyz`, `/liveness`, `/readiness`
- [ ] Backward compatibility: `/v1/health` still works
- [ ] Kubernetes probes are configured correctly
- [ ] Monitoring alerts are set up
- [ ] Documentation is updated

## Monitoring Integration

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 10000
    httpHeaders:
    - name: Accept
      value: application/json
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /readyz
    port: 10000
    httpHeaders:
    - name: Accept
      value: application/json
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Prometheus

```yaml
- job_name: 'royal-equips-api'
  metrics_path: '/metrics'
  static_configs:
    - targets: ['localhost:10000']
  metric_relabel_configs:
    - source_labels: [__name__]
      regex: 'health_.*'
      action: keep
```

### Uptime Monitoring

Configure external monitoring with:
- **Primary:** `/health` endpoint (detailed diagnostics)
- **Secondary:** `/healthz` endpoint (simple liveness)
- **Interval:** 1-5 minutes
- **Timeout:** 5-10 seconds
- **Alert on:** 3 consecutive failures

## Related Documentation

- [Health Endpoints Reference](HEALTH_ENDPOINTS.md)
- [API Specification](openapi/royalgpt-command-api.yaml)
- [Deployment Guide](RUNBOOK.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
