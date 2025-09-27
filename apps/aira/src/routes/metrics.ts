import { FastifyPluginAsync } from 'fastify';
import client from 'prom-client';
import { empireRepo } from '../repository/empire-repo.js';

const registry = new client.Registry();

// HTTP request metrics
const httpCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [registry],
});

// Circuit breaker metrics
const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half_open, 2=open)',
  registers: [registry],
});

const circuitBreakerFailures = new client.Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total number of circuit breaker failures',
  registers: [registry],
});

const circuitBreakerSuccesses = new client.Counter({
  name: 'circuit_breaker_successes_total',
  help: 'Total number of circuit breaker successes',
  registers: [registry],
});

// Business metrics
const activeUsers = new client.Gauge({
  name: 'active_users_current',
  help: 'Current number of active users',
  registers: [registry],
});

const revenue24h = new client.Gauge({
  name: 'revenue_24h_total',
  help: 'Total revenue in last 24 hours',
  registers: [registry],
});

// Add default metrics (process, nodejs)
registry.registerMetric(httpCounter);
registry.registerMetric(httpDuration);
registry.registerMetric(circuitBreakerState);
registry.registerMetric(circuitBreakerFailures);
registry.registerMetric(circuitBreakerSuccesses);
registry.registerMetric(activeUsers);
registry.registerMetric(revenue24h);
client.collectDefaultMetrics({ register: registry });

export const metricsRoute: FastifyPluginAsync = async (app) => {
  // Prometheus metrics endpoint
  app.get('/metrics', async (request, reply) => {
    try {
      // Update circuit breaker metrics if available
      if (app.circuit) {
        const snapshot = await app.circuit.snapshot();
        const stateValue = snapshot.state === 'closed' ? 0 : 
                          snapshot.state === 'half_open' ? 1 : 2;
        circuitBreakerState.set(stateValue);
        circuitBreakerFailures.inc(0); // Keep counter alive
        circuitBreakerSuccesses.inc(0); // Keep counter alive
      }

      // Update business metrics (replace with real data)
      activeUsers.set(1247);
      revenue24h.set(24800);

      const metrics = await registry.metrics();
      reply.type('text/plain').send(metrics);
    } catch (error) {
      app.log.error('Failed to generate metrics:', error);
      reply.code(500).send('Failed to generate metrics');
    }
  });

  // Legacy empire metrics endpoint
  app.get('/api/empire/metrics', async () => {
    return empireRepo.getMetrics();
  });

  // Add instrumentation hooks
  app.addHook('onRequest', async (request) => {
    (request as any).startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const duration = (Date.now() - (request as any).startTime) / 1000;
    const route = request.routerPath || request.url;
    
    httpCounter.inc({
      method: request.method,
      route,
      status_code: reply.statusCode.toString(),
    });

    httpDuration.observe(
      { method: request.method, route },
      duration
    );
  });
};

// Export metrics for external use
export { 
  httpCounter, 
  httpDuration, 
  circuitBreakerState, 
  circuitBreakerFailures, 
  circuitBreakerSuccesses,
  registry 
};