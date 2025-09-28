import { FastifyPluginAsync } from 'fastify';
import { secrets } from '../../../core/secrets/SecretProvider';
import { logger } from '../../../core/logging/logger';
import { perf_tracker, mark, measure } from '../../../core/metrics/perf';

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
  cache_stats?: any;
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

    logger.healthPing('/health', 'ok');
    return response;
  });

  // Kubernetes health check endpoint - simple ok/not ok
  app.get("/healthz", async (req, reply) => {
    mark('healthz_check');
    
    try {
      const uptime = Date.now() - startTime;
      const response = { 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime
      };

      const duration = measure('healthz_check', 'healthz_check');
      logger.healthPing('/healthz', 'ok', duration || undefined);
      
      return reply.code(200).send(response);
    } catch (error) {
      logger.healthPing('/healthz', 'error');
      return reply.code(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  // Readiness check endpoint - comprehensive dependency checks
  app.get("/readyz", async (req, reply) => {
    mark('readyz_check');
    
    try {
      const dependencies: HealthDependency[] = [];
      let overallStatus: 'ok' | 'error' | 'degraded' = 'ok';

      // Check secret resolution system
      try {
        mark('secret_check');
        // Try to resolve a test secret (use fallback to avoid failing)
        const testResult = await secrets.getSecretWithFallback('READINESS_TEST_SECRET', 'test-fallback');
        const secretLatency = measure('secret_check', 'secret_check');
        
        dependencies.push({
          name: 'secrets',
          status: 'ok',
          latency: secretLatency || undefined,
          details: { 
            cache_size: secrets.getCacheStats().size,
            test_resolved: testResult === 'test-fallback' ? 'fallback' : 'provider'
          }
        });
      } catch (error) {
        dependencies.push({
          name: 'secrets',
          status: 'error',
          error: error.message
        });
        overallStatus = 'error';
      }

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

      // Performance metrics
      const perfSummary = perf_tracker.getSummary();
      dependencies.push({
        name: 'performance',
        status: 'ok',
        details: {
          total_measures: perfSummary.total_measures,
          avg_duration: Math.round(perfSummary.avg_duration || 0)
        }
      });

      const duration = measure('readyz_check', 'readyz_check');
      const uptime = Date.now() - startTime;

      const response: HealthResponse = {
        status: overallStatus,
        service: 'Royal Equips API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime,
        dependencies,
        cache_stats: secrets.getCacheStats()
      };

      const httpStatus = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;
      
      logger.healthPing('/readyz', overallStatus, duration || undefined);
      return reply.code(httpStatus).send(response);

    } catch (error) {
      const duration = measure('readyz_check', 'readyz_check');
      logger.error('readyz_check_failed', { 
        error: error.message,
        stack: error.stack,
        duration 
      });
      
      return reply.code(503).send({
        status: 'error',
        service: 'Royal Equips API',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        message: error.message
      });
    }
  });
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

  // Metrics endpoint for monitoring
  app.get("/metrics", async (req, reply) => {
    try {
      const perfSummary = perf_tracker.getSummary();
      const cacheStats = secrets.getCacheStats();
      const uptime = Date.now() - startTime;
      
      const metrics = {
        uptime_seconds: Math.floor(uptime / 1000),
        memory_usage: process.memoryUsage(),
        performance: perfSummary,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      };

      logger.info('metrics_request', { metrics_count: Object.keys(metrics).length });
      return reply.code(200).send(metrics);
    } catch (error) {
      logger.error('metrics_error', { error: error.message });
      return reply.code(500).send({ error: 'Failed to collect metrics' });
    }
  });
};

export default healthRoutes;