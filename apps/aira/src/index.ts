/**
 * AIRA - Main Empire Agent (Command Center)
 * 
 * Central super-agent that orchestrates all domains (frontend, backend, infra, data, finance, ops)
 * with omniscient context, NL→Action planning, verified auto-execution, and approval gates.
 */

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { chatRoute } from './routes/chat.js';
import { executeRoute } from './routes/execute.js';

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
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow Command Center UI
  credentials: true
});

// Health check endpoint
app.get('/health', async () => ({ 
  ok: true, 
  service: 'AIRA',
  version: '1.0.0',
  timestamp: new Date().toISOString() 
}));

// AIRA API routes
await app.register(chatRoute);
await app.register(executeRoute);

// Global error handler
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.status(500).send({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT || 10000);
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    app.log.info(`🚀 AIRA Main Empire Agent running on http://${host}:${port}`);
    app.log.info('🎯 Command Center ready for omniscient orchestration');
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();