import { FastifyPluginAsync } from 'fastify';

const systemRoutes: FastifyPluginAsync = async (app) => {
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
    return reply.send({ ok: true, timestamp: new Date().toISOString() });
  });
};

export default systemRoutes;