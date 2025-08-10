/**
 * Cloudflare Workers entry point for Royal Equips Orchestrator
 * 
 * This Worker acts as a proxy/router to the main Python FastAPI application
 * deployed on Render. This allows the project to work with Cloudflare Workers
 * while keeping the main application logic in Python.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check endpoint - return immediately from Workers
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: "ok",
        service: "royal-equips-orchestrator",
        environment: "cloudflare-workers",
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Root endpoint
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        message: "Royal Equips Orchestrator - Cloudflare Workers Proxy",
        status: "running",
        python_api: env.PYTHON_API_URL || "https://royal-equips-orchestrator.onrender.com",
        documentation: "This Workers service proxies requests to the Python FastAPI application"
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // For all other requests, proxy to the Python API if configured
    const pythonApiUrl = env.PYTHON_API_URL;
    if (pythonApiUrl) {
      try {
        const proxyUrl = new URL(url.pathname + url.search, pythonApiUrl);
        const proxyRequest = new Request(proxyUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
        
        const response = await fetch(proxyRequest);
        return response;
      } catch (error) {
        return new Response(JSON.stringify({
          error: "Failed to proxy request to Python API",
          details: error.message,
          fallback: "Cloudflare Workers endpoint"
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Fallback response
    return new Response(JSON.stringify({
      message: "Royal Equips Orchestrator",
      status: "available",
      note: "Python API URL not configured for proxying"
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};