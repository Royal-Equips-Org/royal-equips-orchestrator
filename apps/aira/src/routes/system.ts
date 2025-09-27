import { FastifyPluginAsync } from 'fastify';

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/v1/system/status', async () => {
    // In real implementatie: queries naar DB/services
    const timestamp = new Date().toISOString();
    
    // Mock data structure - replace with real queries
    const agents = {
      total: 5,
      active: 4,
      idle: 1,
      failed: 0,
      types: {
        'data-agent': { count: 2, status: 'active' },
        'commerce-agent': { count: 1, status: 'active' },  
        'analytics-agent': { count: 1, status: 'active' },
        'monitoring-agent': { count: 1, status: 'idle' }
      }
    };

    const opportunities = {
      total: 127,
      pending: 15,
      processing: 8,
      completed: 98,
      failed: 6,
      categories: {
        'price-optimization': 45,
        'inventory-sync': 32,
        'customer-insights': 28,
        'performance-tuning': 22
      }
    };

    const metrics = {
      performance: {
        cpuUsage: 67.3,
        memoryUsage: 84.1,
        diskUsage: 45.2,
        networkThroughput: 1240000 // bytes/sec
      },
      business: {
        activeUsers: 1247,
        conversionRate: 3.2,
        revenue24h: 24800,
        ordersProcessed: 89
      },
      system: {
        uptime: 3600 * 24 * 7, // 7 days in seconds
        requestCount: 145230,
        errorRate: 0.02,
        avgResponseTime: 145 // ms
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
        environment: process.env.NODE_ENV || 'development'
      },
      agents,
      opportunities,
      metrics,
      circuitBreaker: circuitBreakerStatus,
      health: {
        overall: 'healthy',
        components: {
          database: 'healthy',
          redis: 'healthy', 
          shopify: 'healthy',
          workers: 'healthy'
        }
      }
    };
  });
};