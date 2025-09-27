import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (app) => {
  // Basic health check
  app.get("/health", async () => ({ 
    ok: true, 
    service: 'Royal Equips API',
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  }));

  // Health check endpoint
  app.get("/healthz", async () => ({ 
    ok: true,
    timestamp: new Date().toISOString()
  }));

  // Readiness check endpoint
  app.get("/readyz", async (req, reply) => {
    try {
      // Check dependencies here (DB, Redis, etc.)
      const allDepsOK = true; // TODO: implement actual dependency checks
      
      if (allDepsOK) {
        return reply.code(200).send({ 
          ok: true, 
          dependencies: { db: 'ok', redis: 'ok' },
          timestamp: new Date().toISOString() 
        });
      } else {
        return reply.code(503).send({ 
          ok: false, 
          dependencies: { db: 'error', redis: 'error' },
          timestamp: new Date().toISOString() 
        });
      }
    } catch (error) {
      return reply.code(503).send({ 
        ok: false, 
        error: 'Health check failed',
        timestamp: new Date().toISOString() 
      });
    }
  });
};

export default healthRoutes;