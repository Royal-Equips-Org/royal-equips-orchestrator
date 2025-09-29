import { FastifyPluginAsync, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redisHealthCheck(): Promise<{ healthy: boolean; response?: any; error?: string }>;
  }
}

async function shopifyPing(): Promise<boolean> {
  // Real implementatie: call Shopify GraphQL / simple REST endpoint
  // Placeholder: just resolve true (geen mock data leakage, enkel reachability)
  try {
    // TODO: Replace with actual Shopify health check when available
    // const response = await fetch('https://your-shop.myshopify.com/api/2023-10/shop.json', {
    //   headers: {
    //     'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || ''
    //   }
    // });
    // return response.ok;
    return true;
  } catch (error) {
    console.warn('Shopify ping failed:', error);
    return false;
  }
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Lightweight liveness probe - no rate limiting needed as it doesn't access database
  app.get('/v1/healthz', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'aira',
      version: '1.0.0'
    };
  });

  // Comprehensive readiness check - add specific rate limiting for database access
  app.get('/v1/readyz', {
    config: {
      rateLimit: {
        max: 20, // Max 20 requests per window
        timeWindow: '1 minute', // Per minute for health checks
        skipOnError: true,
        keyGenerator: (request: any) => {
          // Use IP for health endpoint rate limiting
          return `health:${request.ip}`;
        }
      }
    }
  }, async (request, reply: FastifyReply) => {
    const checks = {
      redis: { healthy: false, latency: 0, error: null as string | null },
      shopify: { healthy: false, error: null as string | null },
      circuitBreaker: { healthy: true, state: 'unknown' as string }
    };

    // Check Redis connection
    try {
      const start = Date.now();
      const redisHealth = await app.redisHealthCheck();
      checks.redis.healthy = redisHealth.healthy;
      checks.redis.latency = Date.now() - start;
      if (!redisHealth.healthy) {
        checks.redis.error = redisHealth.error || 'Unknown Redis error';
      }
    } catch (error) {
      checks.redis.error = error instanceof Error ? error.message : String(error);
    }

    // Check Shopify connectivity
    try {
      checks.shopify.healthy = await shopifyPing();
      if (!checks.shopify.healthy) {
        checks.shopify.error = 'Shopify ping failed';
      }
    } catch (error) {
      checks.shopify.error = error instanceof Error ? error.message : String(error);
    }

    // Check circuit breaker status
    try {
      if (app.circuit) {
        const snapshot = await app.circuit.snapshot();
        checks.circuitBreaker.state = snapshot.state;
        checks.circuitBreaker.healthy = snapshot.state !== 'open';
      }
    } catch (error) {
      checks.circuitBreaker.healthy = false;
      console.warn('Circuit breaker check failed:', error);
    }

    const allHealthy = checks.redis.healthy && checks.shopify.healthy && checks.circuitBreaker.healthy;
    const status = allHealthy ? 200 : 503;

    return reply.code(status).send({
      status: allHealthy ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        healthy: allHealthy,
        redis: checks.redis.healthy,
        shopify: checks.shopify.healthy,
        circuitBreaker: checks.circuitBreaker.healthy
      }
    });
  });
};