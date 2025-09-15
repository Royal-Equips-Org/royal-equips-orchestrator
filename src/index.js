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

// Handle CORS preflight requests
app.options('/api/*', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
});

// API proxy - forward all /api/* requests to backend with enhanced SSE and binary support
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

    // Prepare request headers - remove accept-encoding to avoid compression mismatches
    const headers = new Headers(c.req.raw.headers);
    headers.delete('accept-encoding'); // Always remove to ensure clean pass-through
    
    // Set forwarding headers
    headers.set('x-forwarded-for', c.req.header('CF-Connecting-IP') || '');
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-forwarded-host', url.host);
    headers.set('x-real-ip', c.req.header('CF-Connecting-IP') || '');

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
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Expose-Headers', '*');
    
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
    console.error('API proxy error:', error);
    return c.json({
      error: "Upstream request failed",
      details: String(error),
      timestamp: new Date().toISOString()
    }, 502);
  }
});

// Admin handler - Streamlit-first with holographic fallback
async function handleAdmin(c) {
  const streamlitUrl = c.env.STREAMLIT_URL;
  const adminEmbed = c.env.ADMIN_EMBED;

  // If STREAMLIT_URL is configured, handle Streamlit integration
  if (streamlitUrl) {
    try {
      // Test if Streamlit is reachable
      const healthCheck = await fetch(streamlitUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      if (healthCheck.ok) {
        // Streamlit is reachable
        if (adminEmbed === '1') {
          // Embed Streamlit in iframe
          return serveStreamlitEmbed(streamlitUrl);
        } else {
          // Default: redirect to Streamlit (recommended for WebSocket compatibility)
          return c.redirect(streamlitUrl, 302);
        }
      }
    } catch (error) {
      console.log('Streamlit health check failed:', error.message);
    }
  }

  // Fallback: serve holographic control center
  return serveHolographicFallback(c);
}

function serveStreamlitEmbed(streamlitUrl) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Royal Equips - Admin Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: white;
            height: 100vh;
            overflow: hidden;
        }
        .embed-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .embed-header {
            background: rgba(13, 13, 23, 0.9);
            backdrop-filter: blur(20px);
            padding: 1rem 2rem;
            border-bottom: 1px solid rgba(0, 255, 255, 0.15);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .embed-title {
            font-size: 1.2rem;
            font-weight: 600;
            background: linear-gradient(45deg, #00ffff, #ff00ff);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .embed-actions {
            display: flex;
            gap: 1rem;
        }
        .embed-btn {
            padding: 0.5rem 1rem;
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid rgba(0, 255, 255, 0.2);
            color: #00ffff;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        .embed-btn:hover {
            background: rgba(0, 255, 255, 0.2);
            border-color: #00ffff;
        }
        .embed-frame {
            flex: 1;
            border: none;
            width: 100%;
        }
        .fallback-notice {
            text-align: center;
            padding: 2rem;
            color: #a0a0a0;
        }
    </style>
</head>
<body>
    <div class="embed-container">
        <div class="embed-header">
            <h1 class="embed-title">Royal Equips - Admin Dashboard</h1>
            <div class="embed-actions">
                <a href="${streamlitUrl}" target="_blank" class="embed-btn">🗗 Open Direct</a>
                <a href="/admin?fallback=1" class="embed-btn">🎮 Holographic Mode</a>
            </div>
        </div>
        <iframe 
            class="embed-frame" 
            src="${streamlitUrl}" 
            title="Royal Equips Admin Dashboard"
            allow="camera; microphone; fullscreen"
            sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
        >
            <div class="fallback-notice">
                <p>Your browser doesn't support iframes or the Streamlit app couldn't load.</p>
                <p><a href="${streamlitUrl}" class="embed-btn">Open Streamlit Directly</a></p>
            </div>
        </iframe>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache',
      'X-Frame-Options': 'DENY' // Prevent this embed from being embedded elsewhere
    }
  });
}

function serveHolographicFallback(c) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Royal Equips - Holographic Control Center</title>
    <style>
        /* === RESET & BASE === */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            /* Enhanced color palette with better contrast */
            --primary-cyan: #00E5FF;
            --primary-magenta: #E91E63;
            --primary-electric: #4BC3FF;
            --primary-neon-green: #2DFF88;
            --primary-neon-orange: #FF6B35;
            --primary-purple: #9C27B0;
            --bg-dark: #0A0A0F;
            --bg-void: #000000;
            --bg-panel: #10131A;
            --glass-bg: rgba(16, 19, 26, 0.85);
            --glass-bg-light: rgba(16, 19, 26, 0.6);
            --glass-border: rgba(0, 229, 255, 0.25);
            --glass-border-accent: rgba(233, 30, 99, 0.25);
            --text-primary: #FFFFFF;
            --text-secondary: #B0BEC5;
            --text-accent: #00E5FF;
            --text-warning: #FF3B3B;
            --text-success: #2DFF88;
            --glow-cyan: rgba(0, 229, 255, 0.4);
            --glow-magenta: rgba(233, 30, 99, 0.4);
            --glow-electric: rgba(75, 195, 255, 0.4);
            --glow-neon: rgba(45, 255, 136, 0.4);
            /* Analytics colors */
            --chart-primary: #00E5FF;
            --chart-secondary: #E91E63;
            --chart-tertiary: #4BC3FF;
            --chart-quaternary: #2DFF88;
            --chart-warning: #FF6B35;
            --chart-danger: #FF3B3B;
            /* Security colors */
            --security-safe: #2DFF88;
            --security-warning: #FFC107;
            --security-danger: #FF3B3B;
            --security-critical: #E91E63;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Courier New', monospace;
            background: var(--bg-void);
            color: var(--text-primary);
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }
        
        /* === ENHANCED STARFIELD BACKGROUND === */
        .starfield {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(2px 2px at 20px 30px, var(--primary-cyan), transparent),
                radial-gradient(1.5px 1.5px at 40px 70px, var(--primary-magenta), transparent),
                radial-gradient(1px 1px at 90px 40px, var(--primary-neon-green), transparent),
                radial-gradient(0.8px 0.8px at 130px 80px, var(--primary-electric), transparent),
                radial-gradient(2px 2px at 160px 30px, #ffffff, transparent),
                radial-gradient(1px 1px at 200px 50px, var(--primary-neon-orange), transparent),
                radial-gradient(0.5px 0.5px at 50px 120px, var(--primary-purple), transparent),
                var(--bg-dark);
            background-repeat: repeat;
            background-size: 250px 150px;
            animation: starfieldMove 25s linear infinite, starfieldPulse 8s ease-in-out infinite;
            z-index: -1;
        }
        
        .starfield::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(3px 3px at 80px 20px, var(--primary-electric), transparent),
                radial-gradient(2px 2px at 120px 90px, var(--primary-neon-green), transparent),
                radial-gradient(1.5px 1.5px at 180px 60px, var(--primary-cyan), transparent);
            background-repeat: repeat;
            background-size: 300px 200px;
            animation: starfieldMove 30s linear infinite reverse, starfieldGlow 6s ease-in-out infinite;
            opacity: 0.7;
        }
        
        @keyframes starfieldMove {
            0% { transform: translateY(0) translateX(0); }
            50% { transform: translateY(-50px) translateX(25px); }
            100% { transform: translateY(-150px) translateX(0); }
        }
        
        @keyframes starfieldPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        
        @keyframes starfieldGlow {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 0.4; }
        }
        
        /* === ENHANCED MAIN LAYOUT === */
        .control-center {
            display: flex;
            height: 100vh;
            background: linear-gradient(135deg, 
                rgba(10, 10, 15, 0.95) 0%, 
                rgba(16, 19, 26, 0.8) 30%,
                rgba(22, 33, 62, 0.85) 60%, 
                rgba(26, 26, 46, 0.9) 100%);
            backdrop-filter: blur(10px);
            position: relative;
        }
        
        .control-center::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(circle at 20% 30%, var(--glow-cyan), transparent 40%),
                radial-gradient(circle at 80% 70%, var(--glow-magenta), transparent 40%),
                radial-gradient(circle at 50% 50%, var(--glow-electric), transparent 60%);
            opacity: 0.1;
            z-index: -1;
        }
        
        /* === ENHANCED NAVIGATION SIDEBAR === */
        .nav-sidebar {
            width: 280px;
            background: var(--glass-bg);
            backdrop-filter: blur(25px);
            border-right: 2px solid var(--glass-border);
            display: flex;
            flex-direction: column;
            position: relative;
            box-shadow: inset 0 0 50px rgba(0, 229, 255, 0.05);
        }
        
        .nav-sidebar::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                135deg,
                transparent 0%,
                rgba(0, 229, 255, 0.02) 25%,
                transparent 50%,
                rgba(233, 30, 99, 0.02) 75%,
                transparent 100%
            );
            pointer-events: none;
        }
        
        .nav-header {
            padding: 2rem 1.5rem;
            border-bottom: 1px solid var(--glass-border);
            text-align: center;
        }
        
        .nav-title {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(45deg, var(--primary-cyan), var(--primary-magenta));
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: holographicPulse 3s ease-in-out infinite;
        }
        
        .nav-subtitle {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-top: 0.5rem;
            font-weight: 300;
        }
        
        @keyframes holographicPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .nav-menu {
            flex: 1;
            padding: 1rem 0;
        }
        
        .nav-item {
            display: block;
            width: 100%;
            padding: 1rem 1.5rem;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1rem;
            text-align: left;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            text-decoration: none;
        }
        
        .nav-item:hover {
            color: var(--primary-cyan);
            background: rgba(0, 255, 255, 0.1);
            box-shadow: inset 4px 0 0 var(--primary-cyan);
        }
        
        .nav-item.active {
            color: var(--primary-cyan);
            background: var(--glow-cyan);
            box-shadow: inset 4px 0 0 var(--primary-cyan);
        }
        
        .nav-item:focus {
            outline: 2px solid var(--primary-cyan);
            outline-offset: -2px;
        }
        
        /* === MAIN CONTENT === */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .page {
            display: none;
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
        }
        
        .page.active {
            display: flex;
            flex-direction: column;
        }
        
        .page-title {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 2rem;
            background: linear-gradient(45deg, var(--primary-cyan), var(--primary-magenta));
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        /* === OVERVIEW PAGE === */
        .overview-grid {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 2rem;
            height: calc(100vh - 8rem);
        }
        
        .central-hub {
            position: relative;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .hub-canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
        
        .sidebar-panels {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .panel {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 1.5rem;
            flex: 1;
        }
        
        .panel-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--primary-cyan);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        .status-item {
            padding: 1rem;
            background: rgba(0, 255, 255, 0.05);
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-radius: 8px;
            text-align: center;
        }
        
        .status-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--primary-cyan);
        }
        
        .status-label {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-top: 0.5rem;
        }
        
        .events-feed {
            max-height: 200px;
            overflow-y: auto;
        }
        
        .event-item {
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            background: rgba(255, 0, 255, 0.05);
            border-left: 3px solid var(--primary-magenta);
            border-radius: 0 8px 8px 0;
            font-size: 0.9rem;
        }
        
        .event-time {
            color: var(--text-secondary);
            font-size: 0.8rem;
        }
        
        /* === ANALYTICS PANEL STYLES === */
        .analytics-panel {
            background: linear-gradient(135deg, 
                rgba(0, 229, 255, 0.08) 0%,
                rgba(75, 195, 255, 0.05) 100%);
            border: 1px solid var(--glass-border);
        }
        
        .analytics-grid {
            display: grid;
            gap: 1rem;
        }
        
        .metric-card {
            padding: 1rem;
            background: rgba(0, 229, 255, 0.1);
            border: 1px solid rgba(0, 229, 255, 0.25);
            border-radius: 10px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent,
                rgba(0, 229, 255, 0.1),
                transparent);
            animation: shimmer 3s infinite;
        }
        
        @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        .metric-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--primary-electric);
            margin-bottom: 0.5rem;
        }
        
        .metric-label {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
        }
        
        .metric-trend {
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .trending-up {
            color: var(--text-success);
        }
        
        .trending-down {
            color: var(--text-warning);
        }
        
        .metric-chart {
            height: 40px;
            background: linear-gradient(90deg, 
                transparent 0%,
                var(--primary-electric) 20%,
                var(--primary-neon-green) 40%,
                var(--primary-electric) 60%,
                transparent 100%);
            opacity: 0.3;
            border-radius: 20px;
            margin-top: 0.5rem;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scaleY(1); }
            50% { opacity: 0.6; transform: scaleY(0.8); }
        }
        
        /* === SECURITY PANEL STYLES === */
        .security-panel {
            background: linear-gradient(135deg, 
                rgba(45, 255, 136, 0.08) 0%,
                rgba(233, 30, 99, 0.05) 100%);
            border: 1px solid var(--security-safe);
        }
        
        .security-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        .security-item {
            padding: 0.8rem;
            background: rgba(45, 255, 136, 0.08);
            border: 1px solid rgba(45, 255, 136, 0.2);
            border-radius: 8px;
            text-align: center;
        }
        
        .security-status {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.3rem;
        }
        
        .security-status.secure {
            color: var(--security-safe);
        }
        
        .security-status.monitoring {
            color: var(--security-warning);
        }
        
        .security-status.alert {
            color: var(--security-danger);
        }
        
        .security-value {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--primary-neon-green);
        }
        
        .security-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        /* === VOICE CONTROL & AR INTERFACE STYLES === */
        .voice-ar-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }
        
        .voice-control-btn, .ar-mode-btn, .biometric-btn {
            width: 50px;
            height: 50px;
            border-radius: 25px;
            border: 2px solid var(--glass-border);
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            color: var(--text-primary);
            font-size: 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .voice-control-btn:hover, .ar-mode-btn:hover, .biometric-btn:hover {
            background: var(--glass-bg-light);
            box-shadow: 0 0 20px var(--glow-cyan);
            transform: scale(1.1);
        }
        
        /* === AR OVERLAY STYLES === */
        .ar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .ar-hud {
            position: relative;
            width: 80%;
            height: 80%;
            border: 2px solid var(--primary-electric);
            border-radius: 20px;
            background: linear-gradient(135deg, 
                rgba(0, 229, 255, 0.1) 0%,
                rgba(75, 195, 255, 0.05) 100%);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .ar-targeting-system {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 200px;
            height: 200px;
            border: 3px solid var(--primary-electric);
            border-radius: 50%;
            animation: arTargeting 3s linear infinite;
        }
        
        .ar-targeting-system::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            border: 2px solid var(--primary-neon-green);
            border-radius: 50%;
            animation: arTargeting 2s linear infinite reverse;
        }
        
        .ar-targeting-system::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            background: var(--primary-neon-green);
            border-radius: 50%;
            animation: pulse 1s ease-in-out infinite;
        }
        
        @keyframes arTargeting {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        .ar-data-stream {
            position: absolute;
            right: 20px;
            top: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .ar-metric {
            background: rgba(0, 229, 255, 0.15);
            border: 1px solid var(--primary-electric);
            border-radius: 10px;
            padding: 10px 15px;
            min-width: 200px;
        }
        
        .ar-label {
            display: block;
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 5px;
        }
        
        .ar-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary-electric);
        }
        
        /* === VOICE STATUS STYLES === */
        .voice-status {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 2px solid var(--primary-neon-green);
            border-radius: 20px;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 1000;
        }
        
        .voice-indicator {
            display: flex;
            gap: 3px;
            align-items: flex-end;
        }
        
        .voice-wave {
            width: 4px;
            height: 20px;
            background: var(--primary-neon-green);
            border-radius: 2px;
            animation: voiceWave 1s ease-in-out infinite;
        }
        
        .voice-wave:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .voice-wave:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes voiceWave {
            0%, 100% { height: 20px; }
            50% { height: 40px; }
        }
        
        .voice-text {
            color: var(--primary-neon-green);
            font-weight: 600;
        }
        
        /* === BIOMETRIC MODAL STYLES === */
        .biometric-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        
        .biometric-content {
            background: var(--glass-bg);
            backdrop-filter: blur(25px);
            border: 2px solid var(--primary-magenta);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            min-width: 400px;
        }
        
        .biometric-content h3 {
            color: var(--primary-magenta);
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .biometric-scanner {
            position: relative;
            width: 200px;
            height: 200px;
            margin: 20px auto;
            border: 3px solid var(--primary-magenta);
            border-radius: 20px;
            background: rgba(233, 30, 99, 0.1);
            overflow: hidden;
        }
        
        .scanner-grid {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(90deg, rgba(233, 30, 99, 0.3) 1px, transparent 1px),
                linear-gradient(rgba(233, 30, 99, 0.3) 1px, transparent 1px);
            background-size: 20px 20px;
        }
        
        .scan-line {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: var(--primary-magenta);
            box-shadow: 0 0 10px var(--primary-magenta);
            animation: scanLine 2s linear infinite;
        }
        
        @keyframes scanLine {
            0% { top: 0; }
            100% { top: calc(100% - 3px); }
        }
        
        .biometric-progress {
            margin-top: 20px;
            width: 100%;
            height: 6px;
            background: rgba(233, 30, 99, 0.2);
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--primary-magenta), var(--primary-electric));
            border-radius: 3px;
            transition: width 0.1s ease;
        }
        
        .biometric-status {
            margin-top: 15px;
            color: var(--text-primary);
            font-weight: 600;
        }
        
        .close-biometric {
            margin-top: 20px;
            padding: 10px 20px;
            background: rgba(233, 30, 99, 0.2);
            border: 1px solid var(--primary-magenta);
            border-radius: 8px;
            color: var(--primary-magenta);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .close-biometric:hover {
            background: rgba(233, 30, 99, 0.3);
            transform: scale(1.05);
        }
        
        /* === OPERATIONS CENTER STYLES === */
        .operations-dashboard {
            padding: 2rem;
            height: 100%;
            overflow-y: auto;
        }
        
        .ops-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 1.5rem;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .ops-panel {
            background: var(--glass-bg);
            backdrop-filter: blur(25px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
        }
        
        .ops-panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent,
                rgba(0, 229, 255, 0.05),
                transparent);
            animation: shimmer 4s infinite;
        }
        
        .ops-panel-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--primary-electric);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        /* System Performance Metrics */
        .metric-display {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .metric-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .metric-label {
            font-size: 0.9rem;
            color: var(--text-secondary);
            min-width: 100px;
        }
        
        .metric-value-bar {
            flex: 1;
            height: 25px;
            background: rgba(0, 229, 255, 0.1);
            border-radius: 12px;
            margin: 0 1rem;
            position: relative;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            border-radius: 12px;
            transition: width 0.5s ease;
            position: relative;
        }
        
        .cpu-bar {
            background: linear-gradient(90deg, var(--primary-electric), var(--primary-cyan));
        }
        
        .memory-bar {
            background: linear-gradient(90deg, var(--primary-neon-orange), var(--primary-magenta));
        }
        
        .disk-bar {
            background: linear-gradient(90deg, var(--primary-neon-green), var(--primary-electric));
        }
        
        .metric-percentage {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9rem;
        }
        
        /* Network Status */
        .network-stats {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
        }
        
        .network-metric {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 1rem;
            background: rgba(75, 195, 255, 0.1);
            border: 1px solid rgba(75, 195, 255, 0.2);
            border-radius: 10px;
            flex: 1;
            text-align: center;
        }
        
        .network-icon {
            font-size: 1.5rem;
        }
        
        .network-value {
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--primary-electric);
        }
        
        .network-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        /* Process List */
        .process-list {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }
        
        .process-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.8rem;
            background: rgba(45, 255, 136, 0.05);
            border: 1px solid rgba(45, 255, 136, 0.15);
            border-radius: 8px;
        }
        
        .process-name {
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .process-status {
            padding: 0.3rem 0.8rem;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .process-status.running {
            background: rgba(45, 255, 136, 0.2);
            color: var(--security-safe);
            border: 1px solid var(--security-safe);
        }
        
        .process-status.paused {
            background: rgba(255, 193, 7, 0.2);
            color: var(--security-warning);
            border: 1px solid var(--security-warning);
        }
        
        /* Alert List */
        .alert-list {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }
        
        .alert-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            border-radius: 10px;
        }
        
        .alert-success {
            background: rgba(45, 255, 136, 0.1);
            border: 1px solid rgba(45, 255, 136, 0.3);
        }
        
        .alert-warning {
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
        }
        
        .alert-info {
            background: rgba(75, 195, 255, 0.1);
            border: 1px solid rgba(75, 195, 255, 0.3);
        }
        
        .alert-icon {
            font-size: 1.2rem;
            margin-top: 0.2rem;
        }
        
        .alert-title {
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.3rem;
        }
        
        .alert-desc {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        /* Chart Panel */
        .chart-container {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 229, 255, 0.05);
            border-radius: 10px;
            position: relative;
        }
        
        .performance-chart {
            width: 100%;
            height: 100%;
        }
        
        /* Control Panel */
        .control-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        .control-btn {
            padding: 0.8rem 1rem;
            background: var(--glass-bg-light);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .control-btn:hover {
            background: var(--glass-bg);
            box-shadow: 0 0 15px var(--glow-cyan);
            transform: translateY(-2px);
        }
        
        .restart-btn:hover {
            box-shadow: 0 0 15px var(--glow-electric);
        }
        
        .backup-btn:hover {
            box-shadow: 0 0 15px var(--glow-neon);
        }
        
        .optimize-btn:hover {
            box-shadow: 0 0 15px var(--glow-magenta);
        }
        
        .maintenance-btn:hover {
            box-shadow: 0 0 15px rgba(255, 193, 7, 0.4);
        }
        
        /* === DATA ANALYTICS DASHBOARD STYLES === */
        .analytics-dashboard {
            padding: 2rem;
            height: 100%;
            overflow-y: auto;
        }
        
        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 1.5rem;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .analytics-panel {
            background: var(--glass-bg);
            backdrop-filter: blur(25px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
        }
        
        .analytics-panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent,
                rgba(75, 195, 255, 0.05),
                transparent);
            animation: shimmer 5s infinite;
        }
        
        .analytics-panel-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--primary-electric);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        /* Customer Segmentation Rings */
        .segment-rings {
            display: flex;
            justify-content: space-around;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .segment-ring {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 4px solid;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            animation: ringPulse 3s ease-in-out infinite;
        }
        
        .segment-ring.premium {
            border-color: var(--primary-magenta);
            background: radial-gradient(circle, rgba(233, 30, 99, 0.2), transparent);
        }
        
        .segment-ring.standard {
            border-color: var(--primary-electric);
            background: radial-gradient(circle, rgba(75, 195, 255, 0.2), transparent);
        }
        
        .segment-ring.basic {
            border-color: var(--primary-neon-green);
            background: radial-gradient(circle, rgba(45, 255, 136, 0.2), transparent);
        }
        
        @keyframes ringPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .ring-center {
            text-align: center;
        }
        
        .segment-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .segment-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        /* Data Flow Streams */
        .data-streams {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .stream-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            background: rgba(0, 229, 255, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(0, 229, 255, 0.15);
        }
        
        .stream-source {
            font-weight: 600;
            color: var(--text-primary);
            min-width: 120px;
        }
        
        .stream-flow {
            flex: 1;
            height: 4px;
            background: rgba(0, 229, 255, 0.2);
            border-radius: 2px;
            position: relative;
            margin: 0 1rem;
            overflow: hidden;
        }
        
        .flow-line {
            width: 100%;
            height: 100%;
            background: var(--primary-electric);
            border-radius: 2px;
        }
        
        .flow-particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 20px;
            height: 100%;
            background: var(--primary-neon-green);
            border-radius: 2px;
            animation: flowAnimation 2s linear infinite;
        }
        
        @keyframes flowAnimation {
            0% { left: -20px; }
            100% { left: 100%; }
        }
        
        .stream-rate {
            font-weight: 600;
            color: var(--primary-electric);
            min-width: 80px;
            text-align: right;
        }
        
        /* Prediction Metrics */
        .prediction-metrics {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .prediction-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            background: rgba(156, 39, 176, 0.08);
            border: 1px solid rgba(156, 39, 176, 0.2);
            border-radius: 10px;
        }
        
        .prediction-icon {
            font-size: 1.5rem;
            margin-top: 0.2rem;
        }
        
        .prediction-title {
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.3rem;
        }
        
        .prediction-value {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--primary-neon-green);
            margin-bottom: 0.3rem;
        }
        
        .confidence-level {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        /* Behavior Heatmap */
        .behavior-heatmap {
            text-align: center;
        }
        
        .heatmap-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 1rem;
        }
        
        .heatmap-cell {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            animation: heatmapPulse 2s ease-in-out infinite;
        }
        
        .heatmap-cell.high {
            background: var(--primary-magenta);
            box-shadow: 0 0 15px rgba(233, 30, 99, 0.5);
        }
        
        .heatmap-cell.medium {
            background: var(--primary-neon-orange);
            box-shadow: 0 0 10px rgba(255, 107, 53, 0.4);
        }
        
        .heatmap-cell.low {
            background: var(--primary-neon-green);
            box-shadow: 0 0 8px rgba(45, 255, 136, 0.3);
        }
        
        @keyframes heatmapPulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
        }
        
        .heatmap-label {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        
        /* ML Model Performance */
        .ml-metrics {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .ml-model {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: rgba(45, 255, 136, 0.05);
            border: 1px solid rgba(45, 255, 136, 0.15);
            border-radius: 10px;
        }
        
        .model-name {
            font-weight: 600;
            color: var(--text-primary);
            min-width: 150px;
        }
        
        .model-accuracy {
            flex: 1;
            height: 20px;
            background: rgba(45, 255, 136, 0.1);
            border-radius: 10px;
            margin-left: 1rem;
            position: relative;
            overflow: hidden;
        }
        
        .accuracy-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--primary-neon-green), var(--primary-electric));
            border-radius: 10px;
            transition: width 0.5s ease;
            position: relative;
        }
        
        .accuracy-value {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9rem;
        }
        
        /* Data Quality Indicators */
        .quality-indicators {
            display: flex;
            justify-content: space-around;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .quality-metric {
            text-align: center;
        }
        
        .quality-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 4px solid;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.5rem;
            position: relative;
            animation: qualityPulse 2s ease-in-out infinite;
        }
        
        .quality-circle.excellent {
            border-color: var(--security-safe);
            background: radial-gradient(circle, rgba(45, 255, 136, 0.2), transparent);
        }
        
        .quality-circle.good {
            border-color: var(--security-warning);
            background: radial-gradient(circle, rgba(255, 193, 7, 0.2), transparent);
        }
        
        @keyframes qualityPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(45, 255, 136, 0.3); }
            50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(45, 255, 136, 0.5); }
        }
        
        .quality-percentage {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .quality-label {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        /* === AGENTS PAGE === */
        .agents-workspace {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 2rem;
            height: calc(100vh - 8rem);
        }
        
        .chat-sessions {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 1.5rem;
            overflow-y: auto;
        }
        
        .session-item {
            padding: 1rem;
            margin-bottom: 0.5rem;
            background: rgba(0, 255, 255, 0.05);
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .session-item:hover,
        .session-item.active {
            background: var(--glow-cyan);
            border-color: var(--primary-cyan);
        }
        
        .chat-room {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            display: flex;
            flex-direction: column;
        }
        
        .chat-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--glass-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .voice-controls {
            display: flex;
            gap: 1rem;
        }
        
        .voice-btn {
            padding: 0.5rem 1rem;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            color: var(--text-primary);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .voice-btn:hover {
            background: var(--glow-cyan);
            border-color: var(--primary-cyan);
        }
        
        .voice-btn.active {
            background: var(--primary-cyan);
            color: var(--bg-dark);
        }
        
        .chat-messages {
            flex: 1;
            padding: 1.5rem;
            overflow-y: auto;
            max-height: calc(100vh - 250px);
        }
        
        .message {
            margin-bottom: 1.5rem;
            display: flex;
            flex-direction: column;
        }
        
        .message.user {
            align-items: flex-end;
        }
        
        .message-content {
            max-width: 70%;
            padding: 1rem 1.5rem;
            border-radius: 15px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
        }
        
        .message.user .message-content {
            background: var(--glow-cyan);
            border-color: var(--primary-cyan);
        }
        
        .chat-input {
            padding: 1.5rem;
            border-top: 1px solid var(--glass-border);
            display: flex;
            gap: 1rem;
        }
        
        .message-input {
            flex: 1;
            padding: 1rem 1.5rem;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 25px;
            color: var(--text-primary);
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
        }
        
        .message-input:focus {
            border-color: var(--primary-cyan);
            box-shadow: 0 0 0 2px var(--glow-cyan);
        }
        
        .send-btn {
            padding: 1rem 2rem;
            background: var(--primary-cyan);
            border: none;
            border-radius: 25px;
            color: var(--bg-dark);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .send-btn:hover {
            background: var(--primary-magenta);
        }
        
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* === PLACEHOLDER PAGES === */
        .placeholder-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .placeholder-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 2rem;
            text-align: center;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .placeholder-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: var(--primary-cyan);
        }
        
        .placeholder-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--primary-cyan);
        }
        
        .placeholder-desc {
            color: var(--text-secondary);
            line-height: 1.6;
        }
        
        /* === LOADING STATES === */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid var(--glass-border);
            border-radius: 50%;
            border-top: 2px solid var(--primary-cyan);
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* === RESPONSIVE === */
        @media (max-width: 768px) {
            .control-center {
                flex-direction: column;
            }
            
            .nav-sidebar {
                width: 100%;
                height: auto;
                order: 2;
            }
            
            .overview-grid {
                grid-template-columns: 1fr;
                grid-template-rows: 1fr auto;
            }
            
            .agents-workspace {
                grid-template-columns: 1fr;
                grid-template-rows: auto 1fr;
            }
        }
        
        /* === REDUCED MOTION === */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
            
            .starfield {
                animation: none;
            }
        }
        
        /* === HIGH CONTRAST === */
        @media (prefers-contrast: high) {
            :root {
                --glass-bg: rgba(0, 0, 0, 0.9);
                --glass-border: rgba(255, 255, 255, 0.8);
                --text-secondary: #cccccc;
            }
        }
        
        /* === ACCESSIBILITY === */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        
        :focus {
            outline: 2px solid var(--primary-cyan);
            outline-offset: 2px;
        }
    </style>
</head>
<body>
    <div class="starfield" aria-hidden="true"></div>
    
    <div class="control-center" role="main">
        <!-- Navigation Sidebar -->
        <nav class="nav-sidebar" role="navigation" aria-label="Main navigation">
            <div class="nav-header">
                <h1 class="nav-title">ROYAL EQUIPS</h1>
                <p class="nav-subtitle">Holographic Control Center</p>
            </div>
            
            <div class="nav-menu">
                <button class="nav-item active" data-page="overview" aria-label="Overview page">
                    📊 Overview
                </button>
                <button class="nav-item" data-page="operations" aria-label="Operations page">
                    ⚡ Operations
                </button>
                <button class="nav-item" data-page="data" aria-label="Data page">
                    💾 Data
                </button>
                <button class="nav-item" data-page="commerce" aria-label="Commerce page">
                    🛒 Commerce
                </button>
                <button class="nav-item" data-page="agents" aria-label="Agents page">
                    🤖 Agents
                </button>
                <button class="nav-item" data-page="settings" aria-label="Settings page">
                    ⚙️ Settings
                </button>
            </div>
        </nav>
        
        <!-- Main Content Area -->
        <div class="main-content">
            <!-- Voice Control & AR Interface -->
            <div class="voice-ar-controls">
                <button id="voiceControlBtn" class="voice-control-btn" title="Activate Voice Control">
                    🎤
                </button>
                <button id="arModeBtn" class="ar-mode-btn" title="Toggle AR Visualization Mode">
                    👁️
                </button>
                <button id="biometricBtn" class="biometric-btn" title="Biometric Authentication">
                    🔐
                </button>
            </div>
            <!-- Overview Page -->
            <div class="page active" id="overview" role="tabpanel" aria-labelledby="overview-title">
                <h2 id="overview-title" class="page-title">SYSTEM OVERVIEW</h2>
                
                <div class="overview-grid">
                    <div class="central-hub" role="region" aria-label="Central control hub">
                        <canvas class="hub-canvas" id="hubCanvas" width="800" height="600" aria-label="Live system visualization"></canvas>
                    </div>
                    
                    <div class="sidebar-panels">
                        <div class="panel" role="region" aria-labelledby="status-title">
                            <h3 id="status-title" class="panel-title">🟢 System Status</h3>
                            <div class="status-grid">
                                <div class="status-item">
                                    <div class="status-value" id="worker-status">ONLINE</div>
                                    <div class="status-label">Cloudflare Worker</div>
                                </div>
                                <div class="status-item">
                                    <div class="status-value" id="backend-status">CHECKING</div>
                                    <div class="status-label">Backend API</div>
                                </div>
                                <div class="status-item">
                                    <div class="status-value" id="shopify-status">UNKNOWN</div>
                                    <div class="status-label">Shopify Store</div>
                                </div>
                                <div class="status-item">
                                    <div class="status-value" id="codebase-status">ACTIVE</div>
                                    <div class="status-label">Codebase</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="panel analytics-panel" role="region" aria-labelledby="analytics-title">
                            <h3 id="analytics-title" class="panel-title">📊 Real-Time Analytics</h3>
                            <div class="analytics-grid">
                                <div class="metric-card">
                                    <div class="metric-value" id="active-users">1,247</div>
                                    <div class="metric-label">Active Users</div>
                                    <div class="metric-chart" id="usersChart"></div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-value" id="conversion-rate">3.2%</div>
                                    <div class="metric-label">Conversion Rate</div>
                                    <div class="metric-trend trending-up">↗ +0.4%</div>
                                </div>
                                <div class="metric-card">
                                    <div class="metric-value" id="revenue">$24.8K</div>
                                    <div class="metric-label">Revenue (24h)</div>
                                    <div class="metric-trend trending-up">↗ +12.3%</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="panel security-panel" role="region" aria-labelledby="security-title">
                            <h3 id="security-title" class="panel-title">🛡️ Security Monitor</h3>
                            <div class="security-grid">
                                <div class="security-item">
                                    <div class="security-status secure">SECURE</div>
                                    <div class="security-label">Firewall Status</div>
                                </div>
                                <div class="security-item">
                                    <div class="security-status monitoring">MONITORING</div>
                                    <div class="security-label">Threat Detection</div>
                                </div>
                                <div class="security-item">
                                    <div class="security-value">0</div>
                                    <div class="security-label">Active Threats</div>
                                </div>
                                <div class="security-item">
                                    <div class="security-value">99.9%</div>
                                    <div class="security-label">Uptime</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="panel" role="region" aria-labelledby="events-title">
                            <h3 id="events-title" class="panel-title">📡 Live Events</h3>
                            <div class="events-feed" id="eventsFeed" aria-live="polite">
                                <div class="event-item">
                                    <div>System initialized</div>
                                    <div class="event-time">Now</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Operations Page -->
            <div class="page" id="operations" role="tabpanel" aria-labelledby="operations-title">
                <h2 id="operations-title" class="page-title">OPERATIONS CENTER</h2>
                <div class="operations-dashboard">
                    <div class="ops-grid">
                        <!-- Real-time System Metrics -->
                        <div class="ops-panel cpu-panel">
                            <h3 class="ops-panel-title">⚡ System Performance</h3>
                            <div class="metric-display">
                                <div class="metric-item">
                                    <div class="metric-label">CPU Usage</div>
                                    <div class="metric-value-bar">
                                        <div class="progress-bar cpu-bar" style="width: 67%"></div>
                                        <span class="metric-percentage">67%</span>
                                    </div>
                                </div>
                                <div class="metric-item">
                                    <div class="metric-label">Memory Usage</div>
                                    <div class="metric-value-bar">
                                        <div class="progress-bar memory-bar" style="width: 84%"></div>
                                        <span class="metric-percentage">84%</span>
                                    </div>
                                </div>
                                <div class="metric-item">
                                    <div class="metric-label">Disk I/O</div>
                                    <div class="metric-value-bar">
                                        <div class="progress-bar disk-bar" style="width: 23%"></div>
                                        <span class="metric-percentage">23%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Network Monitoring -->
                        <div class="ops-panel network-panel">
                            <h3 class="ops-panel-title">📡 Network Status</h3>
                            <div class="network-stats">
                                <div class="network-metric">
                                    <div class="network-icon">↗️</div>
                                    <div class="network-details">
                                        <div class="network-value">2.4 GB/s</div>
                                        <div class="network-label">Upload</div>
                                    </div>
                                </div>
                                <div class="network-metric">
                                    <div class="network-icon">↙️</div>
                                    <div class="network-details">
                                        <div class="network-value">1.8 GB/s</div>
                                        <div class="network-label">Download</div>
                                    </div>
                                </div>
                                <div class="network-metric">
                                    <div class="network-icon">🌐</div>
                                    <div class="network-details">
                                        <div class="network-value">99.9%</div>
                                        <div class="network-label">Uptime</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Active Processes -->
                        <div class="ops-panel processes-panel">
                            <h3 class="ops-panel-title">🔄 Active Processes</h3>
                            <div class="process-list">
                                <div class="process-item">
                                    <div class="process-name">ML Analytics Engine</div>
                                    <div class="process-status running">RUNNING</div>
                                </div>
                                <div class="process-item">
                                    <div class="process-name">Data Sync Service</div>
                                    <div class="process-status running">RUNNING</div>
                                </div>
                                <div class="process-item">
                                    <div class="process-name">Security Monitor</div>
                                    <div class="process-status running">RUNNING</div>
                                </div>
                                <div class="process-item">
                                    <div class="process-name">Backup Service</div>
                                    <div class="process-status paused">PAUSED</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Security Alerts -->
                        <div class="ops-panel alerts-panel">
                            <h3 class="ops-panel-title">🚨 Security Alerts</h3>
                            <div class="alert-list">
                                <div class="alert-item alert-success">
                                    <div class="alert-icon">✅</div>
                                    <div class="alert-content">
                                        <div class="alert-title">Firewall Status</div>
                                        <div class="alert-desc">All systems secure</div>
                                    </div>
                                </div>
                                <div class="alert-item alert-warning">
                                    <div class="alert-icon">⚠️</div>
                                    <div class="alert-content">
                                        <div class="alert-title">High CPU Usage</div>
                                        <div class="alert-desc">Above 65% threshold</div>
                                    </div>
                                </div>
                                <div class="alert-item alert-info">
                                    <div class="alert-icon">ℹ️</div>
                                    <div class="alert-content">
                                        <div class="alert-title">System Update</div>
                                        <div class="alert-desc">Available v2.1.4</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Live Analytics Chart -->
                        <div class="ops-panel chart-panel">
                            <h3 class="ops-panel-title">📈 Performance Trends</h3>
                            <div class="chart-container">
                                <canvas id="performanceChart" class="performance-chart"></canvas>
                            </div>
                        </div>
                        
                        <!-- System Control -->
                        <div class="ops-panel control-panel">
                            <h3 class="ops-panel-title">⚙️ System Control</h3>
                            <div class="control-buttons">
                                <button class="control-btn restart-btn">🔄 Restart Services</button>
                                <button class="control-btn backup-btn">💾 Create Backup</button>
                                <button class="control-btn optimize-btn">⚡ Optimize Performance</button>
                                <button class="control-btn maintenance-btn">🔧 Maintenance Mode</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Data Analytics Page -->
            <div class="page" id="data" role="tabpanel" aria-labelledby="data-title">
                <h2 id="data-title" class="page-title">DATA ANALYTICS & INTELLIGENCE</h2>
                <div class="analytics-dashboard">
                    <div class="analytics-grid">
                        <!-- Customer Segmentation -->
                        <div class="analytics-panel customer-panel">
                            <h3 class="analytics-panel-title">👥 Customer Segmentation</h3>
                            <div class="segment-rings">
                                <div class="segment-ring premium">
                                    <div class="ring-center">
                                        <div class="segment-value">23%</div>
                                        <div class="segment-label">Premium</div>
                                    </div>
                                </div>
                                <div class="segment-ring standard">
                                    <div class="ring-center">
                                        <div class="segment-value">45%</div>
                                        <div class="segment-label">Standard</div>
                                    </div>
                                </div>
                                <div class="segment-ring basic">
                                    <div class="ring-center">
                                        <div class="segment-value">32%</div>
                                        <div class="segment-label">Basic</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Real-time Data Flow -->
                        <div class="analytics-panel dataflow-panel">
                            <h3 class="analytics-panel-title">🔄 Data Flow Monitor</h3>
                            <div class="data-streams">
                                <div class="stream-item">
                                    <div class="stream-source">API Gateway</div>
                                    <div class="stream-flow">
                                        <div class="flow-line"></div>
                                        <div class="flow-particles"></div>
                                    </div>
                                    <div class="stream-rate">2.4K/sec</div>
                                </div>
                                <div class="stream-item">
                                    <div class="stream-source">Database</div>
                                    <div class="stream-flow">
                                        <div class="flow-line"></div>
                                        <div class="flow-particles"></div>
                                    </div>
                                    <div class="stream-rate">1.8K/sec</div>
                                </div>
                                <div class="stream-item">
                                    <div class="stream-source">ML Engine</div>
                                    <div class="stream-flow">
                                        <div class="flow-line"></div>
                                        <div class="flow-particles"></div>
                                    </div>
                                    <div class="stream-rate">856/sec</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Predictive Analytics -->
                        <div class="analytics-panel prediction-panel">
                            <h3 class="analytics-panel-title">🔮 Predictive Analytics</h3>
                            <div class="prediction-metrics">
                                <div class="prediction-item">
                                    <div class="prediction-icon">📈</div>
                                    <div class="prediction-content">
                                        <div class="prediction-title">Revenue Forecast</div>
                                        <div class="prediction-value">+18.5% next quarter</div>
                                        <div class="confidence-level">Confidence: 89%</div>
                                    </div>
                                </div>
                                <div class="prediction-item">
                                    <div class="prediction-icon">👥</div>
                                    <div class="prediction-content">
                                        <div class="prediction-title">Customer Growth</div>
                                        <div class="prediction-value">+2.3K new customers</div>
                                        <div class="confidence-level">Confidence: 76%</div>
                                    </div>
                                </div>
                                <div class="prediction-item">
                                    <div class="prediction-icon">🛒</div>
                                    <div class="prediction-content">
                                        <div class="prediction-title">Conversion Rate</div>
                                        <div class="prediction-value">4.2% estimated</div>
                                        <div class="confidence-level">Confidence: 92%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Behavioral Insights -->
                        <div class="analytics-panel behavior-panel">
                            <h3 class="analytics-panel-title">🧠 Behavioral Insights</h3>
                            <div class="behavior-heatmap">
                                <div class="heatmap-grid">
                                    <div class="heatmap-cell high"></div>
                                    <div class="heatmap-cell medium"></div>
                                    <div class="heatmap-cell high"></div>
                                    <div class="heatmap-cell low"></div>
                                    <div class="heatmap-cell medium"></div>
                                    <div class="heatmap-cell high"></div>
                                    <div class="heatmap-cell high"></div>
                                    <div class="heatmap-cell medium"></div>
                                    <div class="heatmap-cell low"></div>
                                </div>
                                <div class="heatmap-labels">
                                    <div class="heatmap-label">User Engagement Heat Map</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- ML Model Performance -->
                        <div class="analytics-panel ml-panel">
                            <h3 class="analytics-panel-title">🤖 ML Model Performance</h3>
                            <div class="ml-metrics">
                                <div class="ml-model">
                                    <div class="model-name">Recommendation Engine</div>
                                    <div class="model-accuracy">
                                        <div class="accuracy-bar" style="width: 94%"></div>
                                        <span class="accuracy-value">94.2%</span>
                                    </div>
                                </div>
                                <div class="ml-model">
                                    <div class="model-name">Fraud Detection</div>
                                    <div class="model-accuracy">
                                        <div class="accuracy-bar" style="width: 98%"></div>
                                        <span class="accuracy-value">98.7%</span>
                                    </div>
                                </div>
                                <div class="ml-model">
                                    <div class="model-name">Price Optimization</div>
                                    <div class="model-accuracy">
                                        <div class="accuracy-bar" style="width: 87%"></div>
                                        <span class="accuracy-value">87.3%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Data Quality Monitor -->
                        <div class="analytics-panel quality-panel">
                            <h3 class="analytics-panel-title">✅ Data Quality</h3>
                            <div class="quality-indicators">
                                <div class="quality-metric">
                                    <div class="quality-circle excellent">
                                        <div class="quality-percentage">99.2%</div>
                                    </div>
                                    <div class="quality-label">Completeness</div>
                                </div>
                                <div class="quality-metric">
                                    <div class="quality-circle good">
                                        <div class="quality-percentage">87.4%</div>
                                    </div>
                                    <div class="quality-label">Accuracy</div>
                                </div>
                                <div class="quality-metric">
                                    <div class="quality-circle excellent">
                                        <div class="quality-percentage">95.8%</div>
                                    </div>
                                    <div class="quality-label">Consistency</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Commerce Page -->
            <div class="page" id="commerce" role="tabpanel" aria-labelledby="commerce-title">
                <h2 id="commerce-title" class="page-title">COMMERCE HUB</h2>
                <div class="placeholder-grid">
                    <div class="placeholder-card">
                        <div class="placeholder-icon">🛒</div>
                        <h3 class="placeholder-title">Shopify Integration</h3>
                        <p class="placeholder-desc">E-commerce platform management and sync</p>
                    </div>
                    <div class="placeholder-card">
                        <div class="placeholder-icon">💳</div>
                        <h3 class="placeholder-title">Payment Processing</h3>
                        <p class="placeholder-desc">Transaction monitoring and payment gateways</p>
                    </div>
                    <div class="placeholder-card">
                        <div class="placeholder-icon">📦</div>
                        <h3 class="placeholder-title">Order Management</h3>
                        <p class="placeholder-desc">Order processing and fulfillment tracking</p>
                    </div>
                </div>
            </div>
            
            <!-- Agents Page -->
            <div class="page" id="agents" role="tabpanel" aria-labelledby="agents-title">
                <h2 id="agents-title" class="page-title">AI AGENTS</h2>
                
                <div class="agents-workspace">
                    <div class="chat-sessions" role="region" aria-label="Chat sessions">
                        <h3 class="panel-title">Active Sessions</h3>
                        <div id="sessionsList">
                            <div class="session-item active" data-session="main">
                                <div>Main Session</div>
                                <div class="event-time">Active</div>
                            </div>
                        </div>
                        <button class="voice-btn" onclick="createNewSession()" aria-label="Create new chat session">
                            ➕ New Session
                        </button>
                    </div>
                    
                    <div class="chat-room" role="region" aria-label="Chat conversation">
                        <div class="chat-header">
                            <h3 id="currentSessionTitle">Main Session</h3>
                            <div class="voice-controls">
                                <button class="voice-btn" id="ttsToggle" onclick="toggleTTS()" aria-label="Toggle text-to-speech">
                                    🔊 TTS
                                </button>
                                <button class="voice-btn" id="micToggle" onclick="toggleMic()" aria-label="Toggle microphone input">
                                    🎤 MIC
                                </button>
                            </div>
                        </div>
                        
                        <div class="chat-messages" id="chatMessages" aria-live="polite">
                            <div class="message">
                                <div class="message-content">
                                    Welcome to the AI Agents workspace. You can chat with advanced AI assistants here.
                                </div>
                            </div>
                        </div>
                        
                        <div class="chat-input">
                            <input 
                                type="text" 
                                class="message-input" 
                                id="messageInput" 
                                placeholder="Type your message..." 
                                aria-label="Message input"
                                onkeypress="handleMessageKeyPress(event)"
                            >
                            <button class="send-btn" id="sendBtn" onclick="sendMessage()" aria-label="Send message">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Settings Page -->
            <div class="page" id="settings" role="tabpanel" aria-labelledby="settings-title">
                <h2 id="settings-title" class="page-title">SYSTEM SETTINGS</h2>
                <div class="placeholder-grid">
                    <div class="placeholder-card">
                        <div class="placeholder-icon">⚙️</div>
                        <h3 class="placeholder-title">Configuration</h3>
                        <p class="placeholder-desc">System configuration and environment variables</p>
                    </div>
                    <div class="placeholder-card">
                        <div class="placeholder-icon">🔐</div>
                        <h3 class="placeholder-title">Security</h3>
                        <p class="placeholder-desc">Authentication and authorization settings</p>
                    </div>
                    <div class="placeholder-card">
                        <div class="placeholder-icon">🌐</div>
                        <h3 class="placeholder-title">API Settings</h3>
                        <p class="placeholder-desc">API endpoints and integration configuration</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- AR Overlay (Hidden by default) -->
    <div id="arOverlay" class="ar-overlay" style="display: none;">
        <div class="ar-hud">
            <div class="ar-targeting-system"></div>
            <div class="ar-data-stream">
                <div class="ar-metric">
                    <span class="ar-label">SYSTEM LOAD</span>
                    <span class="ar-value" id="arSystemLoad">23.4%</span>
                </div>
                <div class="ar-metric">
                    <span class="ar-label">MEMORY USAGE</span>
                    <span class="ar-value" id="arMemoryUsage">67.2%</span>
                </div>
                <div class="ar-metric">
                    <span class="ar-label">NETWORK I/O</span>
                    <span class="ar-value" id="arNetworkIO">1.2 GB/s</span>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Voice Recognition Status -->
    <div id="voiceStatus" class="voice-status" style="display: none;">
        <div class="voice-indicator">
            <div class="voice-wave"></div>
            <div class="voice-wave"></div>
            <div class="voice-wave"></div>
        </div>
        <div class="voice-text">Listening...</div>
    </div>
    
    <!-- Biometric Authentication Modal -->
    <div id="biometricModal" class="biometric-modal" style="display: none;">
        <div class="biometric-content">
            <h3>🔐 Biometric Authentication</h3>
            <div class="biometric-scanner">
                <div class="scanner-grid">
                    <div class="scan-line"></div>
                </div>
                <div class="biometric-progress">
                    <div class="progress-bar" id="biometricProgress"></div>
                </div>
            </div>
            <div class="biometric-status" id="biometricStatus">Place finger on scanner...</div>
            <button id="closeBiometric" class="close-biometric">Cancel</button>
        </div>
    </div>
    
    <script>
        // === HOLOGRAPHIC CONTROL CENTER JAVASCRIPT ===
        
        // Global state management
        const AppState = {
            currentPage: 'overview',
            currentSession: 'main',
            isTTSEnabled: false,
            isMicEnabled: false,
            isListening: false,
            sessions: { main: [] },
            hubAnimation: null,
            eventSource: null
        };
        
        // === NAVIGATION SYSTEM ===
        function initNavigation() {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    const pageId = item.dataset.page;
                    if (pageId) {
                        switchPage(pageId);
                    }
                });
            });
        }
        
        function switchPage(pageId) {
            // Cleanup current page
            cleanupCurrentPage();
            
            // Update navigation active state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector('[data-page="' + pageId + '"]').classList.add('active');
            
            // Update page visibility
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');
            
            AppState.currentPage = pageId;
            
            // Initialize page-specific features (lazy initialization)
            setTimeout(() => {
                if (pageId === 'overview') {
                    initHubCanvas();
                    initEventsFeed();
                } else if (pageId === 'agents') {
                    initAgentsPage();
                }
            }, 100); // Small delay for smooth transition
        }
        
        function cleanupCurrentPage() {
            // Stop hub animation
            if (AppState.hubAnimation) {
                cancelAnimationFrame(AppState.hubAnimation);
                AppState.hubAnimation = null;
            }
            
            // Close event source if switching away from overview
            if (AppState.currentPage === 'overview' && AppState.eventSource) {
                AppState.eventSource.close();
                AppState.eventSource = null;
            }
        }
        
        // === CENTRAL HUB CANVAS ANIMATION ===
        function initHubCanvas() {
            const canvas = document.getElementById('hubCanvas');
            if (!canvas || AppState.currentPage !== 'overview') return;
            
            // Stop any existing animation
            if (AppState.hubAnimation) {
                cancelAnimationFrame(AppState.hubAnimation);
            }
            
            const ctx = canvas.getContext('2d');
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            let animationTime = 0;
            const nodes = [];
            const arcs = [];
            
            // Initialize nodes and arcs
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI * 2) / 8;
                const radius = 150 + Math.random() * 50;
                nodes.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius,
                    angle: angle,
                    radius: radius,
                    pulse: Math.random() * Math.PI * 2
                });
                
                arcs.push({
                    startAngle: angle,
                    endAngle: angle + Math.PI / 4,
                    radius: radius + 20,
                    speed: 0.01 + Math.random() * 0.02
                });
            }
            
            function animate() {
                // Check if we should still be animating
                if (AppState.currentPage !== 'overview') {
                    AppState.hubAnimation = null;
                    return;
                }
                
                // Performance: only animate if page is visible
                if (document.hidden) {
                    AppState.hubAnimation = requestAnimationFrame(animate);
                    return;
                }
                
                // Enhanced background with subtle glow
                ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                animationTime += 0.016; // ~60fps
                
                // Draw enhanced central core with multiple layers
                const coreRadius = 45 + Math.sin(animationTime * 2) * 6;
                
                // Outer glow layer
                const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 1.8);
                outerGradient.addColorStop(0, 'rgba(0, 229, 255, 0.1)');
                outerGradient.addColorStop(0.5, 'rgba(75, 195, 255, 0.05)');
                outerGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = outerGradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, coreRadius * 1.8, 0, Math.PI * 2);
                ctx.fill();
                
                // Main core with enhanced gradient
                const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
                gradient.addColorStop(0, 'rgba(233, 30, 99, 0.9)');
                gradient.addColorStop(0.3, 'rgba(0, 229, 255, 0.7)');
                gradient.addColorStop(0.7, 'rgba(75, 195, 255, 0.4)');
                gradient.addColorStop(1, 'rgba(0, 229, 255, 0.1)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner pulsing core
                const innerRadius = 15 + Math.sin(animationTime * 4) * 3;
                const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius);
                innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                innerGradient.addColorStop(0.5, 'rgba(45, 255, 136, 0.6)');
                innerGradient.addColorStop(1, 'transparent');
                
                ctx.fillStyle = innerGradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw enhanced orbiting arcs with varied colors
                arcs.forEach((arc, index) => {
                    arc.startAngle += arc.speed;
                    arc.endAngle += arc.speed;
                    
                    // Use different colors for each arc
                    const colors = [
                        'rgba(233, 30, 99, ', // Magenta
                        'rgba(0, 229, 255, ', // Cyan
                        'rgba(75, 195, 255, ', // Electric blue
                        'rgba(45, 255, 136, ', // Neon green
                        'rgba(255, 107, 53, ' // Neon orange
                    ];
                    const colorBase = colors[index % colors.length];
                    const alpha = 0.4 + Math.sin(animationTime * 1.5 + arc.startAngle) * 0.3;
                    
                    ctx.strokeStyle = colorBase + alpha + ')';
                    ctx.lineWidth = 3 + Math.sin(animationTime + index) * 1;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, arc.radius, arc.startAngle, arc.endAngle);
                    ctx.stroke();
                    
                    // Add glow effect
                    ctx.shadowColor = colorBase + '0.6)';
                    ctx.shadowBlur = 10;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                });
                
                // Draw enhanced nodes with varied colors and effects
                nodes.forEach((node, index) => {
                    node.angle += 0.008;
                    node.pulse += 0.12;
                    
                    const x = centerX + Math.cos(node.angle) * node.radius;
                    const y = centerY + Math.sin(node.angle) * node.radius;
                    const size = 5 + Math.sin(node.pulse) * 2.5;
                    
                    // Different colors for different nodes
                    const nodeColors = [
                        'rgba(0, 229, 255, ', // Cyan
                        'rgba(45, 255, 136, ', // Neon green
                        'rgba(233, 30, 99, ', // Magenta
                        'rgba(75, 195, 255, ', // Electric blue
                        'rgba(255, 107, 53, ', // Orange
                        'rgba(156, 39, 176, ', // Purple
                        'rgba(255, 193, 7, ', // Yellow
                        'rgba(255, 59, 59, ' // Red
                    ];
                    const colorBase = nodeColors[index % nodeColors.length];
                    const alpha = 0.7 + Math.sin(node.pulse) * 0.3;
                    
                    // Draw node glow
                    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
                    glowGradient.addColorStop(0, colorBase + alpha + ')');
                    glowGradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = glowGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw main node
                    ctx.fillStyle = colorBase + alpha + ')';
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw enhanced connection to center
                    const connectionAlpha = 0.15 + Math.sin(node.pulse * 0.5) * 0.1;
                    ctx.strokeStyle = colorBase + connectionAlpha + ')';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([5, 10]);
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                });
                
                AppState.hubAnimation = requestAnimationFrame(animate);
            }
            
            animate();
        }
        
        // === SYSTEM STATUS MONITORING ===
        async function initStatusMonitoring() {
            try {
                // Check backend status
                const response = await fetch('/api/health');
                const backendStatusEl = document.getElementById('backend-status');
                if (response.ok) {
                    const data = await response.json();
                    backendStatusEl.textContent = 'ONLINE';
                    backendStatusEl.style.color = 'var(--primary-cyan)';
                } else {
                    backendStatusEl.textContent = 'OFFLINE';
                    backendStatusEl.style.color = 'var(--primary-magenta)';
                }
            } catch (error) {
                const backendStatusEl = document.getElementById('backend-status');
                backendStatusEl.textContent = 'ERROR';
                backendStatusEl.style.color = 'var(--primary-magenta)';
            }
            
            // Initialize live events feed only for overview page
            if (AppState.currentPage === 'overview') {
                initEventsFeed();
            }
        }
        
        function initEventsFeed() {
            // Close existing connection
            if (AppState.eventSource) {
                AppState.eventSource.close();
                AppState.eventSource = null;
            }
            
            try {
                // Attempt to connect to SSE endpoint
                AppState.eventSource = new EventSource('/api/events');
                
                AppState.eventSource.onopen = function(event) {
                    console.log('Events feed connected');
                    addEvent('Events feed connected', 'success');
                };
                
                AppState.eventSource.onmessage = function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        addEvent(data.message || event.data, data.type || 'info');
                    } catch (e) {
                        addEvent(event.data, 'info');
                    }
                };
                
                AppState.eventSource.onerror = function(error) {
                    console.log('EventSource error:', error);
                    AppState.eventSource.close();
                    AppState.eventSource = null;
                    
                    // Show connection error and fallback to simulated events
                    addEvent('Live events unavailable - using simulated feed', 'warning');
                    setTimeout(startSimulatedEvents, 1000);
                };
                
            } catch (error) {
                console.log('SSE not available, using simulated events');
                addEvent('SSE not supported - using simulated feed', 'info');
                startSimulatedEvents();
            }
        }
        
        function addEvent(message, type) {
            type = type || 'info';
            const feed = document.getElementById('eventsFeed');
            if (!feed) return;
            
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.innerHTML = 
                '<div>' + message + '</div>' +
                '<div class="event-time">' + new Date().toLocaleTimeString() + '</div>';
            
            feed.insertBefore(eventItem, feed.firstChild);
            
            // Keep only last 10 events
            while (feed.children.length > 10) {
                feed.removeChild(feed.lastChild);
            }
        }
        
        function startSimulatedEvents() {
            const events = [
                'System heartbeat normal',
                'Database connection stable',
                'Cache refresh completed',
                'API response time: 45ms',
                'Background job processed',
                'Memory usage: 68%',
                'Active sessions: 12',
                'Queue processing: 3 items'
            ];
            
            setInterval(() => {
                if (AppState.currentPage === 'overview') {
                    const randomEvent = events[Math.floor(Math.random() * events.length)];
                    addEvent(randomEvent);
                }
            }, 5000);
        }
        
        // === AGENTS PAGE FUNCTIONALITY ===
        function initAgentsPage() {
            // Initialize session if not exists
            if (!AppState.sessions[AppState.currentSession]) {
                AppState.sessions[AppState.currentSession] = [];
            }
            
            // Check for speech synthesis and recognition support
            updateVoiceButtonStates();
        }
        
        function createNewSession() {
            const sessionId = 'session_' + Date.now();
            AppState.sessions[sessionId] = [];
            
            const sessionsList = document.getElementById('sessionsList');
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            sessionItem.dataset.session = sessionId;
            sessionItem.innerHTML = 
                '<div>Session ' + Object.keys(AppState.sessions).length + '</div>' +
                '<div class="event-time">New</div>';
            
            sessionItem.addEventListener('click', () => switchSession(sessionId));
            sessionsList.appendChild(sessionItem);
            
            switchSession(sessionId);
        }
        
        function switchSession(sessionId) {
            AppState.currentSession = sessionId;
            
            // Update UI
            document.querySelectorAll('.session-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector('[data-session="' + sessionId + '"]').classList.add('active');
            
            // Update chat messages
            renderChatMessages();
            
            // Update session title
            const sessionNumber = Object.keys(AppState.sessions).indexOf(sessionId) + 1;
            document.getElementById('currentSessionTitle').textContent = 
                sessionId === 'main' ? 'Main Session' : 'Session ' + sessionNumber;
        }
        
        function renderChatMessages() {
            const messagesContainer = document.getElementById('chatMessages');
            const messages = AppState.sessions[AppState.currentSession] || [];
            
            messagesContainer.innerHTML = '';
            
            if (messages.length === 0) {
                messagesContainer.innerHTML = 
                    '<div class="message">' +
                        '<div class="message-content">' +
                            'Welcome to the AI Agents workspace. You can chat with advanced AI assistants here.' +
                        '</div>' +
                    '</div>';
                return;
            }
            
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + msg.role;
                messageDiv.innerHTML = 
                    '<div class="message-content">' + msg.content + '</div>';
                messagesContainer.appendChild(messageDiv);
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        function handleMessageKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message to session
            AppState.sessions[AppState.currentSession].push({
                role: 'user',
                content: message
            });
            
            input.value = '';
            renderChatMessages();
            
            // Show loading state
            const sendBtn = document.getElementById('sendBtn');
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<div class="loading"></div>';
            
            try {
                // Send to backend via API proxy
                const response = await fetch('/api/agents/' + AppState.currentSession + '/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        message: message,
                        session_id: AppState.currentSession 
                    })
                });
                
                if (response.ok) {
                    // Start SSE stream for response
                    startAgentStream(AppState.currentSession);
                } else {
                    throw new Error('API request failed with status: ' + response.status);
                }
            } catch (error) {
                console.error('Message send error:', error);
                
                // Fallback response with more helpful message
                const fallbackMessage = 'I apologize, but I\'m currently unable to connect to the AI service. ' +
                    'This could be because the backend API is not configured or unavailable. ' +
                    'Please check the PYTHON_API_URL configuration or try again later.';
                
                AppState.sessions[AppState.currentSession].push({
                    role: 'assistant',
                    content: fallbackMessage
                });
                renderChatMessages();
                
                if (AppState.isTTSEnabled) {
                    speakText('I apologize, but the AI service is currently unavailable.');
                }
            }
            
            // Reset button
            sendBtn.disabled = false;
            sendBtn.innerHTML = 'Send';
        }
        
        function startAgentStream(sessionId) {
            try {
                const eventSource = new EventSource('/api/agents/' + sessionId + '/stream');
                let assistantMessage = '';
                let streamTimeout;
                
                // Set timeout for stream response
                streamTimeout = setTimeout(() => {
                    eventSource.close();
                    console.warn('Agent stream timeout');
                    
                    if (!assistantMessage) {
                        AppState.sessions[sessionId].push({
                            role: 'assistant',
                            content: 'I apologize for the delay. The AI service is taking longer than expected to respond.'
                        });
                        renderChatMessages();
                    }
                }, 30000); // 30 second timeout
                
                eventSource.onmessage = function(event) {
                    clearTimeout(streamTimeout);
                    
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'content' || data.type === 'text') {
                            assistantMessage += (data.text || data.content || '');
                            
                            // Update or add assistant message
                            const messages = AppState.sessions[sessionId];
                            if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
                                messages[messages.length - 1].content = assistantMessage;
                            } else {
                                messages.push({
                                    role: 'assistant',
                                    content: assistantMessage
                                });
                            }
                            
                            renderChatMessages();
                        } else if (data.type === 'done' || data.type === 'end') {
                            eventSource.close();
                            
                            if (AppState.isTTSEnabled && assistantMessage) {
                                speakText(assistantMessage);
                            }
                        } else if (data.type === 'error') {
                            eventSource.close();
                            console.error('Stream error:', data.message);
                            
                            if (!assistantMessage) {
                                AppState.sessions[sessionId].push({
                                    role: 'assistant',
                                    content: 'I encountered an error while processing your request: ' + (data.message || 'Unknown error')
                                });
                                renderChatMessages();
                            }
                        }
                    } catch (e) {
                        console.error('SSE parsing error:', e);
                        // Treat unparseable data as plain text content
                        assistantMessage += event.data;
                        
                        const messages = AppState.sessions[sessionId];
                        if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
                            messages[messages.length - 1].content = assistantMessage;
                        } else {
                            messages.push({
                                role: 'assistant',
                                content: assistantMessage
                            });
                        }
                        renderChatMessages();
                    }
                };
                
                eventSource.onerror = function(error) {
                    clearTimeout(streamTimeout);
                    console.error('Agent stream error:', error);
                    eventSource.close();
                    
                    if (!assistantMessage) {
                        AppState.sessions[sessionId].push({
                            role: 'assistant',
                            content: 'I'm sorry, but there was a connection error while streaming the response. Please try again.'
                        });
                        renderChatMessages();
                    }
                };
                
            } catch (error) {
                console.error('Failed to start agent stream:', error);
                
                // Immediate fallback
                AppState.sessions[sessionId].push({
                    role: 'assistant',
                    content: 'I'm unable to establish a streaming connection. Please check if the streaming endpoint is available.'
                });
                renderChatMessages();
            }
        }
        
        // === VOICE FUNCTIONALITY ===
        function toggleTTS() {
            AppState.isTTSEnabled = !AppState.isTTSEnabled;
            updateVoiceButtonStates();
        }
        
        function toggleMic() {
            if (AppState.isMicEnabled) {
                stopListening();
            } else {
                startListening();
            }
        }
        
        function updateVoiceButtonStates() {
            const ttsBtn = document.getElementById('ttsToggle');
            const micBtn = document.getElementById('micToggle');
            
            if (ttsBtn) {
                ttsBtn.classList.toggle('active', AppState.isTTSEnabled);
                
                // Check TTS support
                if (!('speechSynthesis' in window)) {
                    ttsBtn.disabled = true;
                    ttsBtn.style.opacity = '0.5';
                }
            }
            
            if (micBtn) {
                micBtn.classList.toggle('active', AppState.isMicEnabled);
                
                // Check speech recognition support
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    micBtn.disabled = true;
                    micBtn.style.opacity = '0.5';
                }
            }
        }
        
        function speakText(text) {
            if (!AppState.isTTSEnabled || !('speechSynthesis' in window)) return;
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            speechSynthesis.speak(utterance);
        }
        
        function startListening() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return;
            
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onstart = function() {
                AppState.isMicEnabled = true;
                AppState.isListening = true;
                updateVoiceButtonStates();
            };
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                document.getElementById('messageInput').value = transcript;
            };
            
            recognition.onend = function() {
                AppState.isMicEnabled = false;
                AppState.isListening = false;
                updateVoiceButtonStates();
            };
            
            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                AppState.isMicEnabled = false;
                AppState.isListening = false;
                updateVoiceButtonStates();
            };
            
            recognition.start();
        }
        
        function stopListening() {
            AppState.isMicEnabled = false;
            AppState.isListening = false;
            updateVoiceButtonStates();
        }
        
        // === INITIALIZATION ===
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Holographic Control Center Initialized');
            
            initNavigation();
            initStatusMonitoring();
            
            // Initialize overview page by default
            if (AppState.currentPage === 'overview') {
                initHubCanvas();
            }
            
            // Add keyboard navigation
            document.addEventListener('keydown', function(event) {
                if (event.altKey && event.key >= '1' && event.key <= '6') {
                    const pages = ['overview', 'operations', 'data', 'commerce', 'agents', 'settings'];
                    const pageIndex = parseInt(event.key) - 1;
                    if (pages[pageIndex]) {
                        switchPage(pages[pageIndex]);
                    }
                    event.preventDefault();
                }
            });
            
            // Handle page visibility changes for performance
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    // Page is hidden, reduce activity
                    cleanupCurrentPage();
                } else {
                    // Page is visible, reinitialize if needed
                    if (AppState.currentPage === 'overview') {
                        setTimeout(() => {
                            initHubCanvas();
                            if (!AppState.eventSource) {
                                initEventsFeed();
                            }
                        }, 500);
                    }
                }
            });
            
            // Cleanup on page unload
            window.addEventListener('beforeunload', function() {
                cleanupCurrentPage();
                if (AppState.eventSource) {
                    AppState.eventSource.close();
                }
            });
            
            // Add reduced motion support
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            if (prefersReducedMotion.matches) {
                document.documentElement.style.setProperty('--animation-duration', '0.01s');
            }
        });
        
        // === ADVANCED FEATURES ===
        
        // Voice Recognition System
        let recognition = null;
        let isListening = false;
        
        function initVoiceRecognition() {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';
                
                recognition.onstart = function() {
                    isListening = true;
                    document.getElementById('voiceStatus').style.display = 'block';
                    document.getElementById('voiceControlBtn').style.background = 'var(--glow-neon)';
                };
                
                recognition.onend = function() {
                    isListening = false;
                    document.getElementById('voiceStatus').style.display = 'none';
                    document.getElementById('voiceControlBtn').style.background = '';
                };
                
                recognition.onresult = function(event) {
                    let command = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            command += event.results[i][0].transcript;
                        }
                    }
                    processVoiceCommand(command.trim().toLowerCase());
                };
                
                recognition.onerror = function(event) {
                    console.log('Voice recognition error:', event.error);
                    isListening = false;
                    document.getElementById('voiceStatus').style.display = 'none';
                };
            }
        }
        
        function processVoiceCommand(command) {
            console.log('Voice command received:', command);
            
            // Add event to feed
            addEventToFeed('🎤 Voice Command: ' + command);
            
            if (command.includes('show overview') || command.includes('go to overview')) {
                switchPage('overview');
            } else if (command.includes('show operations')) {
                switchPage('operations');
            } else if (command.includes('show data')) {
                switchPage('data');
            } else if (command.includes('show commerce')) {
                switchPage('commerce');
            } else if (command.includes('show agents')) {
                switchPage('agents');
            } else if (command.includes('show settings')) {
                switchPage('settings');
            } else if (command.includes('toggle ar') || command.includes('show ar')) {
                toggleARMode();
            } else if (command.includes('authenticate') || command.includes('biometric')) {
                showBiometricAuth();
            } else if (command.includes('security status')) {
                addEventToFeed('🛡️ Security Status: All systems secure');
            }
        }
        
        // AR Visualization Mode
        let arMode = false;
        
        function toggleARMode() {
            arMode = !arMode;
            const overlay = document.getElementById('arOverlay');
            const button = document.getElementById('arModeBtn');
            
            if (arMode) {
                overlay.style.display = 'block';
                button.style.background = 'var(--glow-electric)';
                addEventToFeed('👁️ AR Mode Activated');
                startARAnimation();
            } else {
                overlay.style.display = 'none';
                button.style.background = '';
                addEventToFeed('👁️ AR Mode Deactivated');
            }
        }
        
        function startARAnimation() {
            if (!arMode) return;
            
            // Update AR metrics with random data
            document.getElementById('arSystemLoad').textContent = (Math.random() * 100).toFixed(1) + '%';
            document.getElementById('arMemoryUsage').textContent = (50 + Math.random() * 40).toFixed(1) + '%';
            document.getElementById('arNetworkIO').textContent = (Math.random() * 5).toFixed(1) + ' GB/s';
            
            setTimeout(() => startARAnimation(), 2000);
        }
        
        // Biometric Authentication
        function showBiometricAuth() {
            document.getElementById('biometricModal').style.display = 'flex';
            startBiometricScan();
        }
        
        function startBiometricScan() {
            const progressBar = document.getElementById('biometricProgress');
            const status = document.getElementById('biometricStatus');
            let progress = 0;
            
            status.textContent = 'Scanning...';
            
            const scanInterval = setInterval(() => {
                progress += 2;
                progressBar.style.width = progress + '%';
                
                if (progress >= 100) {
                    clearInterval(scanInterval);
                    status.textContent = 'Authentication Successful ✓';
                    status.style.color = 'var(--security-safe)';
                    addEventToFeed('🔐 Biometric Authentication: SUCCESS');
                    
                    setTimeout(() => {
                        document.getElementById('biometricModal').style.display = 'none';
                        progressBar.style.width = '0%';
                        status.textContent = 'Place finger on scanner...';
                        status.style.color = '';
                    }, 2000);
                }
            }, 100);
        }
        
        // Event System
        function addEventToFeed(message) {
            const feed = document.getElementById('eventsFeed');
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.innerHTML = 
                '<div>' + message + '</div>' +
                '<div class="event-time">Now</div>';
            
            feed.insertBefore(eventItem, feed.firstChild);
            
            // Keep only last 10 events
            while (feed.children.length > 10) {
                feed.removeChild(feed.lastChild);
            }
        }
        
        // Initialize Advanced Features
        document.addEventListener('DOMContentLoaded', function() {
            initVoiceRecognition();
            
            // Voice Control Button
            document.getElementById('voiceControlBtn').addEventListener('click', function() {
                if (recognition) {
                    if (isListening) {
                        recognition.stop();
                    } else {
                        recognition.start();
                    }
                } else {
                    addEventToFeed('❌ Voice recognition not supported');
                }
            });
            
            // AR Mode Button
            document.getElementById('arModeBtn').addEventListener('click', toggleARMode);
            
            // Biometric Button
            document.getElementById('biometricBtn').addEventListener('click', showBiometricAuth);
            
            // Close Biometric Modal
            document.getElementById('closeBiometric').addEventListener('click', function() {
                document.getElementById('biometricModal').style.display = 'none';
            });
        });
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache'
    }
  });
}

// Admin SPA - serve Streamlit-first with holographic fallback
app.get('/admin/*', async (c) => {
  // Check for explicit fallback request
  if (c.req.query('fallback') === '1') {
    return serveHolographicFallback(c);
  }
  
  return handleAdmin(c);
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
