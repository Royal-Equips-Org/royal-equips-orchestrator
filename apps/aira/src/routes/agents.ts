import { FastifyPluginAsync } from 'fastify';
import { empireRepo } from '../repository/empire-repo.js';

export const agentsRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/empire/agents', async () => {
    return empireRepo.getAgents();
  });
};