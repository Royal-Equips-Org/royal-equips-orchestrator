/**
 * AIRA - Main Empire Agent (Command Center Backend)
 * 
 * Central super-agent that orchestrates all domains (frontend, backend, infra, data, finance, ops)
 * with omniscient context, NL→Action planning, verified auto-execution, and approval gates.
 * 
 * Production-ready service for integration with Royal Equips Command Center UI.
 */

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
// Redis is optional - comment out to run without Redis
// import redisPlugin from './plugins/redis.js';
// import { RedisCircuitBreaker } from './lib/circuit-breaker.js';
import { healthRoutes } from './routes/health.js';
import { systemRoutes } from './routes/system.js';
import { adminCircuitRoutes } from './routes/admin-circuit.js';
import { metricsRoute } from './routes/metrics.js';
import { agentsRoute } from './routes/agents.js';
import { opportunitiesRoute } from './routes/opportunities.js';
import { campaignsRoute } from './routes/campaigns.js';
import { openaiService } from './services/openai-service.js';
import { empireRepo } from './repository/empire-repo.js';
// import { enhancedAIRARoutes } from './routes/enhanced-aira-routes.js'; // Demo import - removed

// Optional Redis circuit breaker
declare module 'fastify' {
  interface FastifyInstance {
    circuit?: any; // Optional circuit breaker
  }
}

const app = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Security and CORS middleware (casting to any for TypeScript compatibility)
await app.register(helmet as any, {
  contentSecurityPolicy: false // Allow for development
});

await app.register(cors as any, {
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ], // Allow Command Center UI
  credentials: true
});

// Rate limiting middleware - Production-ready configuration
await app.register(rateLimit as any, {
  max: 100, // Max 100 requests per window
  timeWindow: '1 minute', // Per minute
  skipOnError: false, // Don't skip rate limiting on errors
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  },
  errorResponseBuilder: (request: any, context: any) => {
    return {
      error: 'Rate limit exceeded',
      message: `Too many requests, maximum ${context.max} requests per minute allowed`,
      retryAfter: Math.ceil(context.ttl / 1000),
      timestamp: new Date().toISOString()
    };
  },
  keyGenerator: (request: any) => {
    // Use IP + User-Agent for more accurate rate limiting
    return `${request.ip}:${request.headers['user-agent'] || 'unknown'}`;
  }
});

// Register Redis plugin (optional - disabled for demo)
// await app.register(redisPlugin, {
//   host: process.env.REDIS_HOST || 'localhost',
//   port: parseInt(process.env.REDIS_PORT || '6379'),
//   password: process.env.REDIS_PASSWORD,
//   db: parseInt(process.env.REDIS_DB || '0')
// });

// Initialize circuit breaker after Redis is available (optional)
// app.addHook('onReady', async () => {
//   app.decorate('circuit', new RedisCircuitBreaker(app.redis, {
//     failureThreshold: 5,
//     recoveryTimeout: 60000, // 60 seconds
//     minimumRequests: 10,
//     halfOpenMaxCalls: 3,
//     keyPrefix: 'aira_cb'
//   }));
//   app.log.info('Circuit breaker initialized');
// });

// Health check endpoint
app.get('/health', async () => ({ 
  ok: true, 
  service: 'AIRA',
  version: '1.0.0',
  timestamp: new Date().toISOString() 
}));

// Register all route modules
await app.register(healthRoutes);
await app.register(systemRoutes);
await app.register(adminCircuitRoutes);
await app.register(metricsRoute);
await app.register(agentsRoute);
await app.register(opportunitiesRoute);
await app.register(campaignsRoute);

// Register Enhanced AIRA Intelligence routes
// await app.register(enhancedAIRARoutes); // Demo routes - removed

// Simple chat endpoint for basic functionality
interface EmpireChatRequestBody {
  content: string;
}

app.post('/api/empire/chat', async (request, reply) => {
  const { content } = request.body as EmpireChatRequestBody;

  if (typeof content !== 'string' || !content.trim()) {
    reply.status(400).send({
      error: 'Invalid request: "content" must be a non-empty string.',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const response = await openaiService.generateResponse(content);
    return response;
  } catch (error) {
    request.log.error(`Chat error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      content: '🚨 I encountered an issue processing your request. Let me get back online and assist you with empire operations.',
      agent_name: 'AIRA',
      timestamp: new Date().toISOString()
    };
  }
});

// Global error handler with structured logging
app.setErrorHandler((error, request, reply) => {
  const errorContext = {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500
    },
    request: {
      id: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  };

  request.log.error(errorContext);

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  const responseError = isProduction && (error.statusCode || 500) >= 500 
    ? 'Internal Server Error' 
    : error.message;

  reply.status(error.statusCode || 500).send({
    error: responseError,
    timestamp: new Date().toISOString(),
    requestId: request.id
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully`);
  app.close().then(() => {
    app.log.info('Server closed successfully');
    process.exit(0);
  }).catch((err) => {
    app.log.error('Error during shutdown:', err);
    process.exit(1);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT || 10000);
    const host = process.env.HOST || '0.0.0.0';
    
    // Seed the empire repository with sample data
    empireRepo.seed();
    
    await app.listen({ port, host });
    app.log.info(`🚀 AIRA Main Empire Agent running on http://${host}:${port}`);
    app.log.info('🎯 Ready to serve Royal Equips Command Center');
    app.log.info('🛡️ Rate limiting: 100 requests/minute per client');
    app.log.info('📊 Empire API endpoints: /api/empire/{metrics,agents,opportunities,campaigns}');
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start().catch((err) => {
  console.error('Failed to start AIRA service:', err);
  process.exit(1);
});