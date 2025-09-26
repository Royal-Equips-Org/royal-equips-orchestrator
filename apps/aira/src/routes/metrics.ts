import { FastifyPluginAsync } from 'fastify';
import { empireRepo } from '../repository/empire-repo.js';

export const metricsRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/empire/metrics', async () => {
    return empireRepo.getMetrics();
  });
};