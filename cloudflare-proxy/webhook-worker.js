/**
 * Royal Equips Webhook Handler - Cloudflare Worker
 * 
 * Handles GitHub Organization webhooks and Shopify webhooks
 * Routes to appropriate handlers and validates signatures
 */

// Webhook signature verification utilities
class WebhookValidator {
  static async verifyGitHubSignature(signature, body, secret) {
    if (!signature.startsWith('sha256=')) {
      return false;
    }
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const expectedSignature = 'sha256=' + [...new Uint8Array(mac)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return crypto.subtle.timingSafeEqual(
      new TextEncoder().encode(expectedSignature),
      new TextEncoder().encode(signature)
    );
  }
  
  static async verifyShopifySignature(signature, body, secret) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const expectedSignature = [...new Uint8Array(mac)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return crypto.subtle.timingSafeEqual(
      new TextEncoder().encode(expectedSignature),
      new TextEncoder().encode(signature)
    );
  }
}

// GitHub webhook handlers
class GitHubWebhookHandler {
  static async handlePush(payload, env) {
    const { repository, commits, pusher } = payload;
    
    // Send to empire intelligence for processing
    const analyticsData = {
      event: 'github.push',
      timestamp: new Date().toISOString(),
      repository: repository.full_name,
      branch: payload.ref.replace('refs/heads/', ''),
      commits: commits.length,
      pusher: pusher.name,
      files_changed: commits.reduce((acc, commit) => acc + (commit.added?.length || 0) + (commit.modified?.length || 0) + (commit.removed?.length || 0), 0)
    };
    
    // Queue for processing by empire agents
    await env.GITHUB_ANALYTICS_QUEUE?.send(analyticsData);
    
    return { status: 'processed', data: analyticsData };
  }
  
  static async handleIssues(payload, env) {
    const { action, issue, repository } = payload;
    
    const analyticsData = {
      event: `github.issue.${action}`,
      timestamp: new Date().toISOString(),
      repository: repository.full_name,
      issue_number: issue.number,
      issue_title: issue.title,
      assignees: issue.assignees?.map(a => a.login) || [],
      labels: issue.labels?.map(l => l.name) || []
    };
    
    await env.GITHUB_ANALYTICS_QUEUE?.send(analyticsData);
    
    return { status: 'processed', data: analyticsData };
  }
  
  static async handlePullRequest(payload, env) {
    const { action, pull_request, repository } = payload;
    
    const analyticsData = {
      event: `github.pr.${action}`,
      timestamp: new Date().toISOString(),
      repository: repository.full_name,
      pr_number: pull_request.number,
      pr_title: pull_request.title,
      author: pull_request.user.login,
      base_branch: pull_request.base.ref,
      head_branch: pull_request.head.ref,
      files_changed: pull_request.changed_files,
      additions: pull_request.additions,
      deletions: pull_request.deletions
    };
    
    await env.GITHUB_ANALYTICS_QUEUE?.send(analyticsData);
    
    return { status: 'processed', data: analyticsData };
  }
}

// Shopify webhook handlers
class ShopifyWebhookHandler {
  static async handleOrder(payload, env, action) {
    const order = payload;
    
    const analyticsData = {
      event: `shopify.order.${action}`,
      timestamp: new Date().toISOString(),
      order_id: order.id,
      order_number: order.order_number || order.name,
      customer_id: order.customer?.id,
      total_price: parseFloat(order.total_price || 0),
      currency: order.currency,
      line_items_count: order.line_items?.length || 0,
      fulfillment_status: order.fulfillment_status,
      financial_status: order.financial_status,
      source_name: order.source_name,
      gateway: order.gateway,
      tags: order.tags,
      location: {
        country: order.billing_address?.country,
        city: order.billing_address?.city
      }
    };
    
    // Send to analytics processing
    await env.SHOPIFY_ANALYTICS_QUEUE?.send(analyticsData);
    
    // Trigger agent workflows
    await env.ORDER_PROCESSING_QUEUE?.send({
      type: 'order_event',
      action,
      order_data: analyticsData
    });
    
    return { status: 'processed', data: analyticsData };
  }
  
  static async handleProduct(payload, env, action) {
    const product = payload;
    
    const analyticsData = {
      event: `shopify.product.${action}`,
      timestamp: new Date().toISOString(),
      product_id: product.id,
      title: product.title,
      vendor: product.vendor,
      product_type: product.product_type,
      tags: product.tags,
      variants_count: product.variants?.length || 0,
      published_scope: product.published_scope,
      status: product.status
    };
    
    await env.SHOPIFY_ANALYTICS_QUEUE?.send(analyticsData);
    
    // Trigger inventory agents
    await env.INVENTORY_QUEUE?.send({
      type: 'product_event',
      action,
      product_data: analyticsData
    });
    
    return { status: 'processed', data: analyticsData };
  }
  
  static async handleInventory(payload, env) {
    const inventoryLevel = payload;
    
    const analyticsData = {
      event: 'shopify.inventory.updated',
      timestamp: new Date().toISOString(),
      inventory_item_id: inventoryLevel.inventory_item_id,
      location_id: inventoryLevel.location_id,
      available: inventoryLevel.available,
      updated_at: inventoryLevel.updated_at
    };
    
    await env.SHOPIFY_ANALYTICS_QUEUE?.send(analyticsData);
    
    // Trigger inventory forecasting agent
    await env.INVENTORY_QUEUE?.send({
      type: 'inventory_update',
      inventory_data: analyticsData
    });
    
    return { status: 'processed', data: analyticsData };
  }
}

// Main webhook router
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'royal-equips-webhooks'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Only handle POST requests for webhooks
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    try {
      const body = await request.text();
      const headers = request.headers;
      
      // Route based on path
      if (url.pathname.startsWith('/webhooks/github')) {
        return await this.handleGitHubWebhook(body, headers, env);
      } else if (url.pathname.startsWith('/webhooks/shopify')) {
        return await this.handleShopifyWebhook(body, headers, env, url.pathname);
      } else if (url.pathname.startsWith('/api/')) {
        // Proxy API calls to backend
        return await this.proxyToBackend(request, env);
      }
      
      return new Response('Not found', { status: 404 });
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
  
  async handleGitHubWebhook(body, headers, env) {
    const signature = headers.get('X-Hub-Signature-256');
    const event = headers.get('X-GitHub-Event');
    const deliveryId = headers.get('X-GitHub-Delivery');
    
    if (!signature || !event) {
      return new Response('Missing required headers', { status: 400 });
    }
    
    // Verify signature
    const isValid = await WebhookValidator.verifyGitHubSignature(
      signature, 
      body, 
      env.GITHUB_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }
    
    const payload = JSON.parse(body);
    let result;
    
    // Route to appropriate handler
    switch (event) {
      case 'push':
        result = await GitHubWebhookHandler.handlePush(payload, env);
        break;
      case 'issues':
        result = await GitHubWebhookHandler.handleIssues(payload, env);
        break;
      case 'pull_request':
        result = await GitHubWebhookHandler.handlePullRequest(payload, env);
        break;
      default:
        result = { status: 'ignored', event };
    }
    
    // Log webhook receipt
    console.log('GitHub webhook processed:', {
      event,
      deliveryId,
      repository: payload.repository?.full_name,
      result
    });
    
    return new Response(JSON.stringify({
      success: true,
      event,
      deliveryId,
      result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  async handleShopifyWebhook(body, headers, env, pathname) {
    const signature = headers.get('X-Shopify-Hmac-Sha256');
    const topic = headers.get('X-Shopify-Topic');
    const shop = headers.get('X-Shopify-Shop-Domain');
    
    if (!signature || !topic) {
      return new Response('Missing required headers', { status: 400 });
    }
    
    // Verify signature
    const isValid = await WebhookValidator.verifyShopifySignature(
      signature,
      body,
      env.SHOPIFY_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }
    
    const payload = JSON.parse(body);
    let result;
    
    // Route based on topic
    switch (topic) {
      case 'orders/create':
      case 'orders/updated':
      case 'orders/paid':
      case 'orders/cancelled':
        const action = topic.split('/')[1];
        result = await ShopifyWebhookHandler.handleOrder(payload, env, action);
        break;
        
      case 'products/create':
      case 'products/update':
        const productAction = topic.split('/')[1];
        result = await ShopifyWebhookHandler.handleProduct(payload, env, productAction);
        break;
        
      case 'inventory_levels/update':
        result = await ShopifyWebhookHandler.handleInventory(payload, env);
        break;
        
      default:
        result = { status: 'ignored', topic };
    }
    
    // Log webhook receipt
    console.log('Shopify webhook processed:', {
      topic,
      shop,
      result
    });
    
    return new Response(JSON.stringify({
      success: true,
      topic,
      shop,
      result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  async proxyToBackend(request, env) {
    const url = new URL(request.url);
    const upstream = new URL(env.UPSTREAM || 'https://your-backend.example.com');
    
    // Preserve the path and query parameters
    upstream.pathname = url.pathname;
    upstream.search = url.search;
    
    // Create new request with upstream URL but preserve all other properties
    const upstreamRequest = new Request(upstream.toString(), request);
    
    try {
      // Forward request to upstream backend
      const response = await fetch(upstreamRequest);
      
      // Create a new response to modify headers
      const newResponse = new Response(response.body, response);
      
      // Add CORS headers for command center
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      newResponse.headers.set('X-Proxy-By', 'royal-equips-worker');
      
      return newResponse;
    } catch (error) {
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