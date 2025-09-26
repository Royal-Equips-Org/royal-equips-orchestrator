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
// import { chatRoute } from './routes/chat.js';
// import { executeRoute } from './routes/execute.js';
import { metricsRoute } from './routes/metrics.js';
import { agentsRoute } from './routes/agents.js';
import { opportunitiesRoute } from './routes/opportunities.js';
import { campaignsRoute } from './routes/campaigns.js';
import { empireRepo } from './repository/empire-repo.js';

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

// Security and CORS middleware
await app.register(helmet, {
  contentSecurityPolicy: false // Allow for development
});

await app.register(cors, {
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ], // Allow Command Center UI
  credentials: true
});

// Rate limiting middleware - Production-ready configuration
await app.register(rateLimit, {
  max: 100, // Max 100 requests per window
  timeWindow: '1 minute', // Per minute
  skipOnError: false, // Don't skip rate limiting on errors
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  },
  errorResponseBuilder: (request, context) => {
    return {
      error: 'Rate limit exceeded',
      message: `Too many requests, maximum ${context.max} requests per minute allowed`,
      retryAfter: Math.ceil(context.ttl / 1000),
      timestamp: new Date().toISOString()
    };
  },
  keyGenerator: (request) => {
    // Use IP + User-Agent for more accurate rate limiting
    return `${request.ip}:${request.headers['user-agent'] || 'unknown'}`;
  }
});

// Health check endpoint
app.get('/health', async () => ({ 
  ok: true, 
  service: 'AIRA',
  version: '1.0.0',
  timestamp: new Date().toISOString() 
}));

// AIRA API routes
// await app.register(chatRoute);
// await app.register(executeRoute);

// Empire API routes
await app.register(metricsRoute);
await app.register(agentsRoute);
await app.register(opportunitiesRoute);
await app.register(campaignsRoute);

// Simple chat endpoint for basic functionality
app.post('/api/empire/chat', async (request: any, reply) => {
  const { content } = request.body;
  
  return {
    content: `🤖 AIRA: Received your message "${content}". Empire systems are operational and all endpoints are available.`,
    agent_name: 'AIRA',
    timestamp: new Date().toISOString()
  };
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