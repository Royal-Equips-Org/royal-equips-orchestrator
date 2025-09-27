/**
 * Cloudflare Worker: Route everything to upstream backend for single entrypoint
 * Env:
 *  - UPSTREAM_API_BASE (e.g. https://api.royal-equips.com:10000)
 *  - ALLOWED_ORIGINS (comma separated list)
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS middleware with configurable origins
app.use('*', cors({
  origin: '*', // Will be configured via environment
  allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['*'],
  credentials: true,
  exposeHeaders: ['*']
}));

// Worker health endpoint
app.get('/health', (c) => {
  return c.json({
    ok: true,
    worker: "cloudflare-single-entrypoint-proxy",
    timestamp: new Date().toISOString(),
    environment: c.env?.CF_ENVIRONMENT || 'unknown',
    upstreamConfigured: !!c.env?.UPSTREAM_API_BASE
  });
});

// Route EVERYTHING to backend - single entrypoint
app.all('*', async (c) => {
  const upstreamApiBase = c.env.UPSTREAM_API_BASE;

  if (!upstreamApiBase) {
    return c.json({ 
      error: "UPSTREAM_API_BASE is not configured",
      timestamp: new Date().toISOString()
    }, 500);
  }

  try {
    const url = new URL(c.req.url);
    const backendUrl = new URL(upstreamApiBase);

    // Build target URL: backend base + current path + query
    const targetUrl = new URL(url.pathname + url.search, backendUrl);

    // Prepare request headers - remove accept-encoding to avoid compression mismatches
    const headers = new Headers(c.req.raw.headers);
    headers.delete('accept-encoding'); // Always remove to ensure clean pass-through

    // Set forwarding headers with better IP detection
    const cfConnectingIp = c.req.header('CF-Connecting-IP');
    const xForwardedFor = c.req.header('X-Forwarded-For');
    const realIp = cfConnectingIp || xForwardedFor || c.req.header('X-Real-IP') || '';

    headers.set('x-forwarded-for', realIp);
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-forwarded-host', url.host);
    headers.set('x-real-ip', realIp);
    
    // Add request ID for tracing
    const requestId = `cf-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    headers.set('x-request-id', requestId);

    // Create upstream request
    const upstreamInit = {
      method: c.req.method,
      headers,
      redirect: 'follow'
    };

    // Include body for non-GET/HEAD requests
    if (!['GET', 'HEAD'].includes(c.req.method)) {
      upstreamInit.body = c.req.raw.body;
    }

    const response = await fetch(targetUrl.toString(), upstreamInit);

    // Forward response with original status and enhanced headers
    const responseHeaders = new Headers(response.headers);

    // Add comprehensive CORS headers
    const allowedOrigins = (c.env?.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
    const origin = c.req.header('Origin') || '';
    const allowOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    responseHeaders.set('Access-Control-Allow-Origin', allowOrigin);
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Expose-Headers', '*');

    // Add security headers
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-Request-ID', requestId);

    // Handle SSE and streaming responses specially
    const contentType = responseHeaders.get('content-type') || '';
    const isSSEStream = contentType.includes('text/event-stream') || contentType.includes('text/plain');

    if (isSSEStream) {
      responseHeaders.set('Cache-Control', 'no-cache');
      responseHeaders.set('Connection', 'keep-alive');
      responseHeaders.set('X-Accel-Buffering', 'no'); // Disable nginx buffering
    }

    // Pass-through response body for proper streaming support
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Single entrypoint proxy error:', error);
    return c.json({
      error: "Upstream request failed",
      details: String(error),
      timestamp: new Date().toISOString(),
      path: c.req.path
    }, 502);
  }
});

export default app;