import { FastifyPluginAsync } from 'fastify';

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/v1/system/status', async () => {
    const timestamp = new Date().toISOString();
    
    // TODO: Integrate with real agent registry from Flask orchestrator
    // For now, return basic operational status without mock data
    const agents = {
      total: 0,
      active: 0,
      idle: 0,
      failed: 0,
      types: {},
      message: 'Connect to Flask orchestrator /api/agents/status for real agent data'
    };

    const opportunities = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      categories: {},
      message: 'Connect to Flask orchestrator /api/empire/opportunities for real data'
    };

    // Real system metrics from Node.js process
    const metrics = {
      performance: {
        cpuUsage: process.cpuUsage ? (process.cpuUsage().user / 1000000).toFixed(2) : 0,
        memoryUsage: process.memoryUsage ? (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) : 0,
        memoryTotal: process.memoryUsage ? (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) : 0,
        uptime: process.uptime ? process.uptime() : 0
      },
      business: {
        message: 'Business metrics available from Flask /api/empire/metrics endpoint'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      }
    };

    // Get circuit breaker status if available
    let circuitBreakerStatus = null;
    try {
      if (app.circuit) {
        circuitBreakerStatus = await app.circuit.snapshot();
      }
    } catch (error) {
      console.warn('Failed to get circuit breaker status:', error);
    }

    return {
      status: 'operational',
      timestamp,
      service: {
        name: 'aira',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        note: 'AIRA service running - connect to Flask orchestrator for business data'
      },
      agents,
      opportunities,
      metrics,
      circuitBreaker: circuitBreakerStatus,
      integration: {
        flask_orchestrator: 'http://localhost:10000',
        endpoints: {
          agents: '/api/agents/status',
          opportunities: '/api/empire/opportunities',
          metrics: '/api/empire/metrics'
        }
      }
    };
  });
};