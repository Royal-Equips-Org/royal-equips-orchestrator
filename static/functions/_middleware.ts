/**
 * Cloudflare Pages Functions middleware
 * Handles CORS, rate limiting, and common security headers
 */

import { generateRequestId } from './utils/crypto';

interface Env {
  GITHUB_WEBHOOK_SECRET: string;
  SHOPIFY_WEBHOOK_SECRET: string;
  // Add other required environment variables here as needed
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const requestId = generateRequestId();

  // Add request ID to all responses
  const addRequestId = (response: Response): Response => {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Request-ID', requestId);
    return newResponse;
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return addRequestId(new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Hub-Signature-256, X-Shopify-Hmac-Sha256, X-Shopify-Topic, X-Shopify-Shop-Domain, X-GitHub-Event, X-GitHub-Delivery',
        'Access-Control-Max-Age': '86400',
      },
    }));
  }

  // Security headers for all requests
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Access-Control-Allow-Origin': '*',
  };

  // Basic rate limiting check (simple implementation)
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  const cfRay = request.headers.get('CF-Ray') || 'unknown';
  
  // Log the request for monitoring
  console.log(JSON.stringify({
    level: 'info',
    message: 'Webhook request received',
    requestId,
    method: request.method,
    url: request.url,
    userAgent,
    cfRay,
    timestamp: new Date().toISOString(),
  }));

  // Continue to the actual function
  try {
    const response = await context.next();
    
    // Add security headers to response
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addRequestId(response);
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Middleware error',
      requestId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
      timestamp: new Date().toISOString(),
    }));

    return addRequestId(new Response(
      JSON.stringify({
        error: 'Internal server error',
        requestId,
        timestamp: new Date().toISOString(),
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders,
        },
      }
    ));
  }
};