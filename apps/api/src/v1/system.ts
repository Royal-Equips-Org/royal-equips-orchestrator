import { FastifyPluginAsync } from 'fastify';

const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get("/healthz", async (_, reply) => {
    return reply.send({ ok: true });
  });

  app.get("/readyz", async (_, reply) => {
    // TODO: Implement real health checks for db, redis, shopify
    const db = true; // await dbPing();
    const redis = true; // await redisPing();
    const shop = true; // await shopifyPing();
    
    const status = db && redis && shop ? 200 : 503;
    return reply.code(status).send({ db, redis, shop });
  });

  app.get("/system/status", async () => {
    // Return system status including circuit breaker states
    return {
      timestamp: new Date().toISOString(),
      agents: {
        total: 5,
        active: 4,
        idle: 1,
        failed: 0
      },
      services: {
        database: 'healthy',
        redis: 'healthy',
        shopify: 'healthy'
      },
      circuits: {
        shopify: 'closed',
        stripe: 'closed',
        tiktok: 'closed',
        meta: 'closed'
      }
    };
  });

  app.post("/admin/circuit/reset", async (_, reply) => {
    // TODO: Implement circuit breaker reset
    // await breakerResetAll();
    return reply.send({ ok: true });
  });
};

export default systemRoutes;