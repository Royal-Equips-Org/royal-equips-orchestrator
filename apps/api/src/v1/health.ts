import { FastifyPluginAsync } from 'fastify';
import * as fs from 'fs/promises';
import path from 'node:path';

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
  permissions?: {
    contents: string;
    issues: string;
    pullRequests: string;
    actions: string;
  };
}

const healthRoutes: FastifyPluginAsync = async (app) => {
  const startTime = Date.now();

  // Shared readiness check logic
  const performReadinessCheck = async (): Promise<{
    dependencies: HealthDependency[];
    overallStatus: 'ok' | 'error' | 'degraded';
    totalLatency: number;
  }> => {
    const startCheck = Date.now();
    const dependencies: HealthDependency[] = [];
    let overallStatus: 'ok' | 'error' | 'degraded' = 'ok';

    // Check environment variables
    const checkStart = Date.now();
    const requiredEnvVars = ['NODE_ENV'];
    const optionalEnvVars = ['PORT', 'HOST', 'RELEASE'];
    const missingRequired = requiredEnvVars.filter(env => !process.env[env]);
    const missingOptional = optionalEnvVars.filter(env => !process.env[env]);
    
    if (missingRequired.length > 0) {
      dependencies.push({
        name: 'environment',
        status: 'error',
        latency: Date.now() - checkStart,
        error: `Missing required environment variables: ${missingRequired.join(', ')}`,
        details: { 
          missing_required: missingRequired,
          missing_optional: missingOptional,
          node_env: process.env.NODE_ENV
        }
      });
      overallStatus = 'error';
    } else if (missingOptional.length > 0) {
      dependencies.push({
        name: 'environment',
        status: 'degraded',
        latency: Date.now() - checkStart,
        details: { 
          missing_optional: missingOptional,
          node_env: process.env.NODE_ENV,
          port: process.env.PORT || 'default',
          release: process.env.RELEASE || 'dev'
        }
      });
      if (overallStatus === 'ok') overallStatus = 'degraded';
    } else {
      dependencies.push({
        name: 'environment',
        status: 'ok',
        latency: Date.now() - checkStart,
        details: { 
          node_env: process.env.NODE_ENV,
          port: process.env.PORT || 'default',
          release: process.env.RELEASE || 'dev'
        }
      });
    }

    // Check memory usage and system resources
    const memCheckStart = Date.now();
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
    };

    // Memory thresholds
    const memoryStatus = memUsageMB.heapUsed > 1000 ? 'error' : 
                         memUsageMB.heapUsed > 500 ? 'degraded' : 'ok';
    
    if (memoryStatus === 'error') {
      overallStatus = 'error';
    } else if (memoryStatus === 'degraded' && overallStatus === 'ok') {
      overallStatus = 'degraded';
    }

    dependencies.push({
      name: 'memory',
      status: memoryStatus,
      latency: Date.now() - memCheckStart,
      details: {
        ...memUsageMB,
        heap_used_percentage: Math.round((memUsageMB.heapUsed / memUsageMB.heapTotal) * 100)
      }
    });

    // Check file system access
    const fsCheckStart = Date.now();
    try {
      const webRoot = process.env.NODE_ENV === 'production' 
        ? path.join(process.cwd(), "dist-web")
        : path.join(process.cwd(), process.env.WEB_DIST_PATH || "../command-center-ui/dist");
      
      await fs.access(webRoot);
      const stats = await fs.stat(webRoot);
      
      dependencies.push({
        name: 'filesystem',
        status: 'ok',
        latency: Date.now() - fsCheckStart,
        details: {
          web_root: webRoot,
          web_root_exists: true,
          is_directory: stats.isDirectory()
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown filesystem error';
      dependencies.push({
        name: 'filesystem',
        status: 'error',
        latency: Date.now() - fsCheckStart,
        error: `Cannot access web root: ${errorMsg}`,
        details: {
          web_root: process.env.NODE_ENV === 'production' 
            ? path.join(process.cwd(), "dist-web")
            : path.join(process.cwd(), process.env.WEB_DIST_PATH || "../command-center-ui/dist"),
          web_root_exists: false
        }
      });
      overallStatus = 'error';
    }

    // Check Node.js version compatibility
    const nodeCheckStart = Date.now();
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    const nodeStatus = majorVersion >= 18 ? 'ok' : 'degraded';
    if (nodeStatus === 'degraded' && overallStatus === 'ok') {
      overallStatus = 'degraded';
    }

    dependencies.push({
      name: 'runtime',
      status: nodeStatus,
      latency: Date.now() - nodeCheckStart,
      details: {
        node_version: nodeVersion,
        platform: process.platform,
        arch: process.arch,
        uptime_seconds: Math.floor(process.uptime()),
        pid: process.pid
      }
    });

    const totalLatency = Date.now() - startCheck;
    return { dependencies, overallStatus, totalLatency };
  };

  // Basic health check - always returns 200
  app.get("/health", {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      }
    }
  }, async (req, reply) => {
    try {
      const uptime = Date.now() - startTime;
      
      const response: HealthResponse = {
        status: 'ok',
        service: 'Royal Equips API',
        version: process.env.RELEASE || '1.0.0-dev',
        timestamp: new Date().toISOString(),
        uptime,
        permissions: {
          contents: 'read',
          issues: 'write',
          pullRequests: 'write',
          actions: 'read'
        }
      };

      return reply.code(200).send(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Health check failed: ${errorMsg}`);
      
      return reply.code(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: errorMsg
      });
    }
  });

  // Kubernetes health check endpoint - simple liveness probe
  app.get("/healthz", {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute'
      }
    }
  }, async (req, reply) => {
    try {
      const uptime = Date.now() - startTime;
      
      // Basic liveness check - if we can respond, we're alive
      const response = { 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime,
        service: 'Royal Equips API'
      };
      
      app.log.debug('Liveness check passed');
      return reply.code(200).send(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Liveness check failed: ${errorMsg}`);
      
      return reply.code(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: errorMsg
      });
    }
  });

  // Readiness check endpoint - comprehensive dependency checks with filesystem access
  app.get("/readyz", {
    config: {
      rateLimit: {
        max: 10, // More restrictive due to filesystem access
        timeWindow: '1 minute'
      }
    }
  }, async (req, reply) => {
    try {
      const { dependencies, overallStatus, totalLatency } = await performReadinessCheck();
      const uptime = Date.now() - startTime;

      const response: HealthResponse = {
        status: overallStatus,
        service: 'Royal Equips API',
        version: process.env.RELEASE || '1.0.0-dev',
        timestamp: new Date().toISOString(),
        uptime,
        dependencies,
        permissions: {
          contents: 'read',
          issues: 'write',
          pullRequests: 'write',
          actions: 'read'
        }
      };

      const httpStatus = overallStatus === 'ok' ? 200 : 
                         overallStatus === 'degraded' ? 200 : 503;
      
      app.log.info(`Readiness check completed: ${overallStatus} (${totalLatency}ms)`);
      return reply.code(httpStatus).send(response);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Readiness check failed: ${errorMsg}`);
      
      return reply.code(503).send({
        status: 'error',
        service: 'Royal Equips API',
        version: process.env.RELEASE || '1.0.0-dev',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        message: errorMsg,
        uptime: Date.now() - startTime,
        check_duration_ms: 0
      });
    }
  });

  // Add /liveness as an alias for /healthz for compatibility
  app.get("/liveness", {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute'
      }
    }
  }, async (req, reply) => {
    try {
      const uptime = Date.now() - startTime;
      
      const response = { 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime,
        service: 'Royal Equips API'
      };
      
      app.log.debug('Liveness check passed (via /liveness)');
      return reply.code(200).send(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Liveness check failed: ${errorMsg}`);
      
      return reply.code(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: errorMsg
      });
    }
  });

  // Add /readiness as an alias for /readyz for compatibility
  app.get("/readiness", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, async (req, reply) => {
    // Use the same comprehensive checks as /readyz
    try {
      const { dependencies, overallStatus, totalLatency } = await performReadinessCheck();
      const uptime = Date.now() - startTime;

      const response = {
        ready: overallStatus === 'ok',
        status: overallStatus,
        service: 'Royal Equips API',
        version: process.env.RELEASE || '1.0.0-dev',
        timestamp: new Date().toISOString(),
        checks: dependencies,
        uptime,
        check_duration_ms: totalLatency
      };

      const httpStatus = overallStatus === 'ok' ? 200 : (overallStatus === 'degraded' ? 200 : 503);
      app.log.debug(`Readiness check completed (via /readiness): ${overallStatus}`);
      
      return reply.code(httpStatus).send(response);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      app.log.error(`Readiness check failed: ${errorMsg}`);
      
      return reply.code(503).send({
        status: 'error',
        service: 'Royal Equips API',
        version: process.env.RELEASE || '1.0.0-dev',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        message: errorMsg,
        uptime: Date.now() - startTime,
        check_duration_ms: 0
      });
    }
  });
};

export default healthRoutes;