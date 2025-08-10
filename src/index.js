import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS middleware - allow all origins for now (TODO: tighten per env)
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['*'],
  credentials: true
}));

// Worker health endpoint
app.get('/health', (c) => {
  return c.json({
    ok: true,
    worker: "cloudflare",
    timestamp: new Date().toISOString(),
    environment: c.env?.CF_ENVIRONMENT || 'unknown'
  });
});

// API proxy - forward all /api/* requests to backend
app.all('/api/*', async (c) => {
  const pythonApiUrl = c.env.PYTHON_API_URL;
  
  if (!pythonApiUrl) {
    return c.json({ error: "PYTHON_API_URL is not configured" }, 500);
  }

  try {
    const url = new URL(c.req.url);
    const backendUrl = new URL(pythonApiUrl);
    
    // Build target URL: backend base + current path + query
    const targetPath = url.pathname.replace('/api', '') || '/';
    const targetUrl = new URL(targetPath + url.search, backendUrl);

    // Prepare request headers
    const headers = new Headers(c.req.raw.headers);
    headers.delete('accept-encoding'); // Avoid encoding issues
    headers.set('x-forwarded-for', c.req.header('CF-Connecting-IP') || '');
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-forwarded-host', url.host);

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
    
    // Forward response with original status and headers
    const responseHeaders = new Headers(response.headers);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('API proxy error:', error);
    return c.json({
      error: "Upstream request failed",
      details: String(error),
      timestamp: new Date().toISOString()
    }, 502);
  }
});

// Admin SPA - serve the shell for all /admin/* routes
app.get('/admin/*', async (c) => {
  // For now, return a simple HTML shell that will load the built SPA
  // In production, this would serve actual static assets
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Royal Equips - Admin Control Center</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(26, 26, 46, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(45deg, #00ffff, #ff00ff, #00ffff);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: gradient 3s ease infinite;
            margin-bottom: 1rem;
        }
        .subtitle {
            font-size: 1.2rem;
            color: #a0a0a0;
            margin-bottom: 2rem;
        }
        .status {
            padding: 1rem;
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 8px;
            font-family: 'Courier New', monospace;
        }
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">ADMIN CONTROL CENTER</h1>
        <p class="subtitle">Elite Futuristic Interface</p>
        <div class="status">
            <div>Status: INITIALIZING</div>
            <div>Worker: ONLINE</div>
            <div>Backend Proxy: CONFIGURED</div>
            <div>Admin SPA: LOADING...</div>
        </div>
        <script>
            // This will be replaced with the actual SPA loading logic
            setTimeout(() => {
                document.querySelector('.status').innerHTML = 
                    '<div>Status: READY</div>' +
                    '<div>Worker: ONLINE</div>' +
                    '<div>Backend Proxy: ACTIVE</div>' +
                    '<div>Admin SPA: Coming Soon...</div>';
            }, 2000);
        </script>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache'
    }
  });
});

// Fallback route
app.all('*', (c) => {
  return c.json({
    error: "Not found",
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString()
  }, 404);
});

export default app;
