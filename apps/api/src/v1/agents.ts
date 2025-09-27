import { FastifyPluginAsync } from 'fastify';

const agentsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/agents", async () => {
    return {
      agents: [
        {
          id: "product_research",
          name: "Product Research Agent",
          status: "active",
          last_run: new Date(Date.now() - 300000).toISOString(),
          next_scheduled: new Date(Date.now() + 3600000).toISOString(),
          success_rate: 0.95
        },
        {
          id: "inventory_pricing",
          name: "Inventory Pricing Agent", 
          status: "active",
          last_run: new Date(Date.now() - 600000).toISOString(),
          next_scheduled: new Date(Date.now() + 7200000).toISOString(),
          success_rate: 0.92
        },
        {
          id: "marketing",
          name: "Marketing Agent",
          status: "idle",
          last_run: new Date(Date.now() - 1800000).toISOString(),
          next_scheduled: new Date(Date.now() + 1800000).toISOString(),
          success_rate: 0.88
        }
      ],
      total: 3,
      active: 2,
      idle: 1
    };
  });

  app.get("/agents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    // Mock agent details
    const agentDetails = {
      id,
      name: `${id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Agent`,
      status: "active",
      last_run: new Date(Date.now() - 300000).toISOString(),
      next_scheduled: new Date(Date.now() + 3600000).toISOString(),
      success_rate: 0.95,
      config: {
        schedule: "0 */6 * * *",
        timeout: 300,
        retry_count: 3
      },
      metrics: {
        runs_today: 4,
        errors_today: 0,
        avg_duration: 45.2
      }
    };
    
    return reply.send(agentDetails);
  });

  app.post("/agents/:id/run", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    // Mock agent execution
    const runId = `run_${Date.now()}`;
    
    return reply.send({
      run_id: runId,
      agent_id: id,
      status: "started",
      started_at: new Date().toISOString(),
      estimated_duration: 60
    });
  });

  app.get("/agents/:id/logs", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = "50" } = request.query as { limit?: string };
    
    // Mock logs
    const logs = Array.from({ length: Math.min(parseInt(limit), 100) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      level: i % 10 === 0 ? "error" : i % 5 === 0 ? "warn" : "info",
      message: `Agent ${id} log entry ${i + 1}`,
      context: { run_id: `run_${Date.now() - i * 60000}` }
    }));
    
    return reply.send({ logs });
  });
};

export default agentsRoutes;