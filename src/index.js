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

// API proxy - forward all /api/* requests to backend with SSE and binary support
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
    
    // Keep accept-encoding for SSE streams but handle carefully
    const acceptHeader = c.req.header('accept');
    const isSSERequest = acceptHeader && acceptHeader.includes('text/event-stream');
    
    if (!isSSERequest) {
      headers.delete('accept-encoding'); // Avoid encoding issues for regular requests
    }
    
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
    
    // Add defensive CORS headers for API responses
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    
    // Handle SSE responses specially
    if (isSSERequest || responseHeaders.get('content-type')?.includes('text/event-stream')) {
      responseHeaders.set('Cache-Control', 'no-cache');
      responseHeaders.set('Connection', 'keep-alive');
      responseHeaders.set('X-Accel-Buffering', 'no'); // Disable nginx buffering
    }
    
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

// Admin SPA - serve the holographic control center for all /admin/* routes
app.get('/admin/*', async (c) => {
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
            --primary-cyan: #00ffff;
            --primary-magenta: #ff00ff;
            --bg-dark: #0a0a0a;
            --bg-void: #000000;
            --glass-bg: rgba(13, 13, 23, 0.4);
            --glass-border: rgba(0, 255, 255, 0.15);
            --text-primary: #ffffff;
            --text-secondary: #a0a0a0;
            --text-accent: #00ffff;
            --glow-cyan: rgba(0, 255, 255, 0.3);
            --glow-magenta: rgba(255, 0, 255, 0.3);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Courier New', monospace;
            background: var(--bg-void);
            color: var(--text-primary);
            min-height: 100vh;
            overflow: hidden;
            position: relative;
        }
        
        /* === STARFIELD BACKGROUND === */
        .starfield {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(2px 2px at 20px 30px, var(--primary-cyan), transparent),
                radial-gradient(2px 2px at 40px 70px, var(--primary-magenta), transparent),
                radial-gradient(1px 1px at 90px 40px, #ffffff, transparent),
                radial-gradient(1px 1px at 130px 80px, var(--primary-cyan), transparent),
                radial-gradient(2px 2px at 160px 30px, #ffffff, transparent),
                var(--bg-dark);
            background-repeat: repeat;
            background-size: 200px 100px;
            animation: starfieldMove 20s linear infinite;
            z-index: -1;
        }
        
        @keyframes starfieldMove {
            0% { transform: translateY(0); }
            100% { transform: translateY(-100px); }
        }
        
        /* === MAIN LAYOUT === */
        .control-center {
            display: flex;
            height: 100vh;
            background: linear-gradient(135deg, 
                rgba(10, 10, 10, 0.8) 0%, 
                rgba(26, 26, 46, 0.6) 50%, 
                rgba(22, 33, 62, 0.8) 100%);
        }
        
        /* === NAVIGATION SIDEBAR === */
        .nav-sidebar {
            width: 280px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border-right: 1px solid var(--glass-border);
            display: flex;
            flex-direction: column;
            position: relative;
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
                <div class="placeholder-grid">
                    <div class="placeholder-card">
                        <div class="placeholder-icon">⚡</div>
                        <h3 class="placeholder-title">Job Queue</h3>
                        <p class="placeholder-desc">Monitor and manage background jobs and tasks</p>
                    </div>
                    <div class="placeholder-card">
                        <div class="placeholder-icon">📊</div>
                        <h3 class="placeholder-title">Performance Metrics</h3>
                        <p class="placeholder-desc">Real-time system performance and analytics</p>
                    </div>
                    <div class="placeholder-card">
                        <div class="placeholder-icon">🚨</div>
                        <h3 class="placeholder-title">Alerts & Monitoring</h3>
                        <p class="placeholder-desc">System health alerts and incident management</p>
                    </div>
                </div>
            </div>
            
            <!-- Data Page -->
            <div class="page" id="data" role="tabpanel" aria-labelledby="data-title">
                <h2 id="data-title" class="page-title">DATA MANAGEMENT</h2>
                <div class="placeholder-grid">
                    <div class="placeholder-card">
                        <div class="placeholder-icon">💾</div>
                        <h3 class="placeholder-title">Database Status</h3>
                        <p class="placeholder-desc">Monitor database health and connections</p>
                    </div>
                    <div class="placeholder-card">
                        <div class="placeholder-icon">🔄</div>
                        <h3 class="placeholder-title">Data Sync</h3>
                        <p class="placeholder-desc">Synchronization status across systems</p>
                    </div>
                    <div class="placeholder-card">
                        <div class="placeholder-icon">📈</div>
                        <h3 class="placeholder-title">Analytics</h3>
                        <p class="placeholder-desc">Business intelligence and reporting</p>
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
            
            // Initialize page-specific features
            if (pageId === 'overview') {
                initHubCanvas();
            } else if (pageId === 'agents') {
                initAgentsPage();
            }
        }
        
        // === CENTRAL HUB CANVAS ANIMATION ===
        function initHubCanvas() {
            const canvas = document.getElementById('hubCanvas');
            if (!canvas) return;
            
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
                if (AppState.currentPage !== 'overview') {
                    return;
                }
                
                ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                animationTime += 0.016; // ~60fps
                
                // Draw central core
                const coreRadius = 40 + Math.sin(animationTime * 2) * 5;
                const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
                gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw orbiting arcs
                arcs.forEach(arc => {
                    arc.startAngle += arc.speed;
                    arc.endAngle += arc.speed;
                    
                    ctx.strokeStyle = 'rgba(255, 0, 255, ' + (0.3 + Math.sin(animationTime + arc.startAngle) * 0.2) + ')';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, arc.radius, arc.startAngle, arc.endAngle);
                    ctx.stroke();
                });
                
                // Draw nodes with pulsing effect
                nodes.forEach(node => {
                    node.angle += 0.005;
                    node.pulse += 0.1;
                    
                    const x = centerX + Math.cos(node.angle) * node.radius;
                    const y = centerY + Math.sin(node.angle) * node.radius;
                    const size = 4 + Math.sin(node.pulse) * 2;
                    
                    ctx.fillStyle = 'rgba(0, 255, 255, ' + (0.6 + Math.sin(node.pulse) * 0.4) + ')';
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw connection to center
                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                });
                
                requestAnimationFrame(animate);
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
                    backendStatusEl.textContent = 'ONLINE';
                    backendStatusEl.style.color = 'var(--primary-cyan)';
                } else {
                    backendStatusEl.textContent = 'OFFLINE';
                    backendStatusEl.style.color = 'var(--primary-magenta)';
                }
            } catch (error) {
                document.getElementById('backend-status').textContent = 'ERROR';
                document.getElementById('backend-status').style.color = 'var(--primary-magenta)';
            }
            
            // Initialize live events feed
            initEventsFeed();
        }
        
        function initEventsFeed() {
            try {
                // Attempt to connect to SSE endpoint
                AppState.eventSource = new EventSource('/api/events');
                
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
                    // Fallback to simulated events
                    startSimulatedEvents();
                };
                
            } catch (error) {
                console.log('SSE not available, using simulated events');
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
                const response = await fetch('/api/agents/' + AppState.currentSession + '/message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: message })
                });
                
                if (response.ok) {
                    // Start SSE stream for response
                    startAgentStream(AppState.currentSession);
                } else {
                    // Fallback response
                    setTimeout(() => {
                        AppState.sessions[AppState.currentSession].push({
                            role: 'assistant',
                            content: 'I understand your message. This is a simulated response since the backend agent service is not available.'
                        });
                        renderChatMessages();
                        
                        if (AppState.isTTSEnabled) {
                            speakText('I understand your message. This is a simulated response.');
                        }
                    }, 1000);
                }
            } catch (error) {
                console.error('Message send error:', error);
                
                // Fallback response
                AppState.sessions[AppState.currentSession].push({
                    role: 'assistant',
                    content: 'I apologize, but I\'m having trouble connecting to the backend service. This is a simulated response.'
                });
                renderChatMessages();
            }
            
            // Reset button
            sendBtn.disabled = false;
            sendBtn.innerHTML = 'Send';
        }
        
        function startAgentStream(sessionId) {
            try {
                const eventSource = new EventSource('/api/agents/' + sessionId + '/stream');
                let assistantMessage = '';
                
                eventSource.onmessage = function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'content') {
                            assistantMessage += data.text;
                            
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
                        } else if (data.type === 'done') {
                            eventSource.close();
                            
                            if (AppState.isTTSEnabled && assistantMessage) {
                                speakText(assistantMessage);
                            }
                        }
                    } catch (e) {
                        console.error('SSE parsing error:', e);
                    }
                };
                
                eventSource.onerror = function(error) {
                    console.error('Agent stream error:', error);
                    eventSource.close();
                };
                
            } catch (error) {
                console.error('Failed to start agent stream:', error);
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
            initHubCanvas();
            
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
            
            // Cleanup on page unload
            window.addEventListener('beforeunload', function() {
                if (AppState.eventSource) {
                    AppState.eventSource.close();
                }
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
