import { FastifyPluginAsync } from 'fastify';
import { register } from 'prom-client';

const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/metrics", async (_, reply) => {
    reply.type("text/plain");
    return await register.metrics();
  });

  // KPIs summary endpoint for Command Center
  app.get("/summary/kpis", async () => {
    // TODO: Implement real KPI aggregation from DB/Redis
    return {
      timestamp: new Date().toISOString(),
      revenue: {
        today: 15420.30,
        mtd: 124500.80,
        ytd: 850000.25
      },
      margin: {
        percentage: 24.5,
        amount: 35000.12
      },
      ltv: {
        average: 350.75,
        segments: {
          premium: 580.40,
          standard: 220.30
        }
      },
      agents: {
        total: 5,
        active: 4,
        healthy: 4,
        up: true
      },
      webhooks: {
        processed_today: 1547,
        avg_lag_ms: 125,
        error_rate: 0.02
      }
    };
  });
};

export default metricsRoutes;