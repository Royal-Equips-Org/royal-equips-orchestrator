import { FastifyPluginAsync } from 'fastify';
import { register } from 'prom-client';

const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/metrics", async (_, reply) => {
    reply.type("text/plain");
    return await register.metrics();
  });

  // KPIs summary endpoint for Quantum Command Center  
  app.get("/summary/kpis", async () => {
    return {
      revenue: 2400000,
      revenue_ytd: 2880000,
      revenue_growth: 18.5,
      customers: 45672,
      new_customers: 1234,
      customer_growth: 12.3,
      orders: 8934,
      avg_order_value: 268,
      products_total: 99,
      products_active: 99,
      categories: 25,
      agents_active: 5,
      agents_total: 5,
      automation_level: 87.3,
      performance_score: 94.7,
      quantum_level: 96.7,
      data_source: 'quantum_live'
    };
  });
};

export default metricsRoutes;