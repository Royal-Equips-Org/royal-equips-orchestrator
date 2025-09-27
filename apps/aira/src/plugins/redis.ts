import fp from 'fastify-plugin';
import { createClient, RedisClientType } from 'redis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientType;
  }
}

interface RedisOptions {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

async function redisPlugin(fastify: any, options: RedisOptions) {
  const redisUrl = options.url || 
    process.env.REDIS_URL || 
    `redis://${options.host || 'localhost'}:${options.port || 6379}`;

  const client = createClient({
    url: redisUrl,
    password: options.password || process.env.REDIS_PASSWORD,
    database: options.db || parseInt(process.env.REDIS_DB || '0'),
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          fastify.log.error('Redis max reconnection attempts reached');
          return new Error('Redis max reconnection attempts reached');
        }
        const delay = Math.min(retries * 100, 3000);
        fastify.log.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      },
    },
  });

  // Set up event listeners
  client.on('error', (err) => {
    fastify.log.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    fastify.log.info('Redis client connected');
  });

  client.on('ready', () => {
    fastify.log.info('Redis client ready');
  });

  client.on('end', () => {
    fastify.log.warn('Redis client connection ended');
  });

  try {
    await client.connect();
    fastify.log.info('Successfully connected to Redis');
  } catch (error) {
    fastify.log.error('Failed to connect to Redis:', error);
    throw error;
  }

  // Decorate Fastify instance with Redis client
  fastify.decorate('redis', client);

  // Gracefully close Redis connection when Fastify shuts down
  fastify.addHook('onClose', async () => {
    try {
      await client.quit();
      fastify.log.info('Redis connection closed');
    } catch (error) {
      fastify.log.error('Error closing Redis connection:', error);
    }
  });

  // Health check helper
  fastify.decorate('redisHealthCheck', async () => {
    try {
      const result = await client.ping();
      return { healthy: true, response: result };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
}

export default fp(redisPlugin, {
  name: 'redis',
  fastify: '4.x'
});