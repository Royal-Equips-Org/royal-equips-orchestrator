import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({ 
    ok: true, 
    service: 'Royal Equips API',
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  }));
};

export default healthRoutes;