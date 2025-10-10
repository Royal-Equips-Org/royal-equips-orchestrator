import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import systemRoutes from './system.js';
import healthRoutes from './health.js';
import metricsRoutes from './metrics.js';
import shopifyRoutes from './shopify.js';
import webhooksRoutes from './webhooks.js';
import marketingRoutes from './marketing.js';
import financeRoutes from './finance.js';
import agentsRoutes from './agents.js';
import opportunitiesRoutes from './opportunities.js';

const api: FastifyPluginAsync = async (app: FastifyInstance) => {
  // System and health endpoints
  await app.register(systemRoutes);
  await app.register(healthRoutes);
  await app.register(metricsRoutes);
  
  // Core business endpoints
  await app.register(shopifyRoutes);
  await app.register(webhooksRoutes);
  await app.register(marketingRoutes);
  await app.register(financeRoutes);
  
  // Agent management
  await app.register(agentsRoutes);
  await app.register(opportunitiesRoutes);
};

export default api;