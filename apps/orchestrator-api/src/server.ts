import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'crypto';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
});

// Start server
const start = async () => {
  try {
    // Register plugins - casting to any to resolve TypeScript compatibility issues
    await fastify.register(cors as any, {
      origin: true
    });

    await fastify.register(helmet as any, {
      contentSecurityPolicy: false
    });

    await fastify.register(swagger as any, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Royal Equips Orchestrator API',
          description: 'Autonomous Empire Orchestrator API',
          version: '1.0.0'
        },
        servers: [
          {
            url: 'http://localhost:10000',
            description: 'Development server'
          }
        ]
      }
    });

    await fastify.register(swaggerUi as any, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });

    // Health endpoints
    fastify.get('/healthz', async (request, reply) => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    });

    fastify.get('/readyz', async (request, reply) => {
      // Check dependencies (Supabase, Redis, etc.)
      return { status: 'ready', timestamp: new Date().toISOString() };
    });

    fastify.get('/metrics', async (request, reply) => {
      // Prometheus metrics endpoint
      return { 
        metrics: {
          agents_active: 0,
          requests_total: 0,
          uptime_seconds: process.uptime()
        },
        timestamp: new Date().toISOString()
      };
    });

    // Agent management endpoints
    fastify.get('/api/agents', async (request, reply) => {
      return { agents: [], total: 0 };
    });

    fastify.get('/api/agents/:id/status', async (request, reply) => {
      const { id } = request.params as { id: string };
      return { 
        id, 
        status: 'running', 
        last_execution: new Date().toISOString(),
        health: 'healthy'
      };
    });

    // Empire command endpoints
    fastify.post('/api/empire/execute', async (request, reply) => {
      return { 
        execution_id: randomUUID(),
        status: 'queued',
        timestamp: new Date().toISOString()
      };
    });

    fastify.post('/api/empire/rollback', async (request, reply) => {
      return { 
        rollback_id: randomUUID(),
        status: 'initiated',
        timestamp: new Date().toISOString()
      };
    });

    const port = Number(process.env.PORT) || 10000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Royal Equips Orchestrator API running on http://${host}:${port}`);
    console.log(`📖 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();