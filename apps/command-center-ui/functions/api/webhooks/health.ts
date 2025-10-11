/**
 * Webhook Health Check Endpoint
 * Provides health status for webhook processing functions
 */

import { generateRequestId } from '../../utils/crypto';
import { createSuccessResponse } from '../../utils/logger';

interface Env {
  GITHUB_WEBHOOK_SECRET?: string;
  SHOPIFY_WEBHOOK_SECRET?: string;
  INTERNAL_API_SECRET?: string;
  BACKEND_API_URL?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const requestId = generateRequestId();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhooks: {
      github: {
        configured: !!env.GITHUB_WEBHOOK_SECRET,
        endpoint: '/api/webhooks/github',
      },
      shopify: {
        configured: !!env.SHOPIFY_WEBHOOK_SECRET,
        endpoint: '/api/webhooks/shopify',
      },
      commandCenter: {
        configured: !!env.INTERNAL_API_SECRET,
        endpoint: '/api/webhooks/command-center',
      },
    },
    backend: {
      configured: !!(env.BACKEND_API_URL && env.INTERNAL_API_SECRET),
      url: env.BACKEND_API_URL ? env.BACKEND_API_URL.replace(/\/+$/, '') : null,
    },
    version: '1.0.0',
    environment: 'cloudflare-pages',
  };

  // Check if any critical configuration is missing
  const criticalMissing = [];
  if (!env.GITHUB_WEBHOOK_SECRET) criticalMissing.push('GITHUB_WEBHOOK_SECRET');
  if (!env.SHOPIFY_WEBHOOK_SECRET) criticalMissing.push('SHOPIFY_WEBHOOK_SECRET');
  
  if (criticalMissing.length > 0) {
    health.status = 'degraded';
    (health as any).warnings = criticalMissing.map(key => `Missing ${key} configuration`);
  }

  return createSuccessResponse(health, requestId, 200);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const requestId = generateRequestId();
  
  return createSuccessResponse(
    {
      message: 'Webhook health endpoint - use GET method for health check',
      endpoints: [
        'GET /api/webhooks/health - This health check',
        'POST /api/webhooks/github - GitHub organization webhooks',
        'POST /api/webhooks/shopify - Shopify store webhooks',
        'POST /api/webhooks/command-center - Internal system webhooks',
      ],
    },
    requestId,
    200
  );
};