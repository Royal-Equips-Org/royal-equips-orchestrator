import { FastifyPluginAsync } from 'fastify';
import { empireRepo } from '../repository/empire-repo.js';

export const campaignsRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/empire/campaigns', async () => {
    return await empireRepo.getCampaigns();
  });
};