export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const upstream = new URL(env.UPSTREAM);
    
    // Preserve the path and query parameters
    upstream.pathname = url.pathname;
    upstream.search = url.search;
    
    // Ensure Accept header includes application/json for health endpoints
    const isHealthEndpoint = url.pathname === '/health' || 
                             url.pathname === '/healthz' || 
                             url.pathname === '/readyz' ||
                             url.pathname === '/liveness' ||
                             url.pathname === '/readiness';
    
    // Create new request with upstream URL but preserve all other properties
    let upstreamRequest;
    if (isHealthEndpoint && request.method === 'GET') {
      const headers = new Headers(request.headers);
      headers.set('Accept', 'application/json');
      // Create a new Request with the modified headers
      upstreamRequest = new Request(upstream.toString(), {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: 'follow'
      });
    } else {
      upstreamRequest = new Request(upstream.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });
    }
    
    try {
      // Forward request to upstream backend
      const response = await fetch(upstreamRequest);
      
      // Create a new response to modify headers
      const newResponse = new Response(response.body, response);
      
      // Add some headers to indicate proxy
      newResponse.headers.set('X-Proxy-By', 'royal-equips-worker');
      newResponse.headers.set('X-Upstream', env.UPSTREAM);
      
      return newResponse;
    } catch (error) {
      // Return a fallback response if upstream is down
      return new Response(
        JSON.stringify({
          error: 'Backend temporarily unavailable',
          message: 'Please try again in a few moments',
          timestamp: new Date().toISOString()
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Proxy-By': 'royal-equips-worker',
            'X-Error': 'upstream_unavailable'
          }
        }
      );
    }
  }
};