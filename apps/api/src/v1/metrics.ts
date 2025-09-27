import { FastifyPluginAsync } from 'fastify';
import { register } from 'prom-client';

const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/metrics", async (_, reply) => {
    reply.type("text/plain");
    return await register.metrics();
  });
};

export default metricsRoutes;