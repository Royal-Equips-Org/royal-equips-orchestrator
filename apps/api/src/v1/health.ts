import { FastifyPluginAsync } from 'fastify';

interface HealthDependency {
  name: string;
  status: 'ok' | 'error' | 'degraded';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthResponse {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  dependencies?: HealthDependency[];
}

const healthRoutes: FastifyPluginAsync = async (app) => {
  const startTime = Date.now();

  // Basic health check - always returns 200
  app.get("/health", async () => {
    const uptime = Date.now() - startTime;
    
    const response: HealthResponse = {
      status: 'ok',
      service: 'Royal Equips API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime
    };

    return response;
  });

  // Kubernetes health check endpoint - simple ok/not ok
  app.get("/healthz", async (req, reply) => {
    try {
      const uptime = Date.now() - startTime;
      const response = { 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime
      };
      
      return reply.code(200).send(response);
    } catch (error) {
      return reply.code(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  // Readiness check endpoint - comprehensive dependency checks
  app.get("/readyz", async (req, reply) => {
    try {
      const dependencies: HealthDependency[] = [];
      let overallStatus: 'ok' | 'error' | 'degraded' = 'ok';

      // Check environment variables presence
      const requiredEnvVars = ['NODE_ENV'];
      const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
      
      if (missingEnvVars.length > 0) {
        dependencies.push({
          name: 'environment',
          status: 'degraded',
          details: { missing_vars: missingEnvVars }
        });
        if (overallStatus === 'ok') overallStatus = 'degraded';
      } else {
        dependencies.push({
          name: 'environment',
          status: 'ok',
          details: { node_env: process.env.NODE_ENV }
        });
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // Flag if heap usage is over 500MB
      const memoryStatus = memUsageMB.heapUsed > 500 ? 'degraded' : 'ok';
      if (memoryStatus === 'degraded' && overallStatus === 'ok') {
        overallStatus = 'degraded';
      }

      dependencies.push({
        name: 'memory',
        status: memoryStatus,
        details: memUsageMB
      });

      const uptime = Date.now() - startTime;

      const response: HealthResponse = {
        status: overallStatus,
        service: 'Royal Equips API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime,
        dependencies
      };

      const httpStatus = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;
      
      return reply.code(httpStatus).send(response);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      return reply.code(503).send({
        status: 'error',
        service: 'Royal Equips API',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        message: errorMsg
      });
    }
  });
};

export default healthRoutes;