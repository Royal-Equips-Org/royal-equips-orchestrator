import { FastifyPluginAsync, FastifyReply } from 'fastify';

export const adminCircuitRoutes: FastifyPluginAsync = async (app) => {
  // Get circuit breaker state
  app.get('/v1/admin/circuit/state', async (request, reply: FastifyReply) => {
    if (!app.circuit) {
      return reply.code(503).send({
        error: 'Circuit breaker not available',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const snapshot = await app.circuit.snapshot();
      return {
        ...snapshot,
        timestamp: new Date().toISOString(),
        service: 'aira'
      };
    } catch (error) {
      app.log.error({ error }, 'Failed to get circuit breaker state');
      return reply.code(500).send({
        error: 'Failed to retrieve circuit breaker state',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Reset circuit breaker
  app.post('/v1/admin/circuit/reset', async (request, reply: FastifyReply) => {
    if (!app.circuit) {
      return reply.code(503).send({
        error: 'Circuit breaker not available',
        timestamp: new Date().toISOString()
      });
    }

    try {
      await app.circuit.reset();
      app.log.info('Circuit breaker reset via admin endpoint');
      
      return {
        status: 'success',
        message: 'Circuit breaker has been reset',
        timestamp: new Date().toISOString(),
        newState: await app.circuit.snapshot()
      };
    } catch (error) {
      app.log.error({ error }, 'Failed to reset circuit breaker');
      return reply.code(500).send({
        error: 'Failed to reset circuit breaker',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });
};