import { FastifyPluginAsync } from 'fastify';
import { empireRepo } from '../repository/empire-repo.js';

export const opportunitiesRoute: FastifyPluginAsync = async (app) => {
  app.get('/api/empire/opportunities', async () => {
    return await empireRepo.getOpportunities();
  });

  app.post<{
    Params: { id: string };
  }>('/api/empire/opportunities/:id/approve', async (request, reply) => {
    const success = empireRepo.approveOpportunity(request.params.id);
    if (success) {
      reply.status(204);
      return;
    } else {
      reply.status(404);
      return { error: 'Opportunity not found' };
    }
  });

  app.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>('/api/empire/opportunities/:id/reject', async (request, reply) => {
    const success = empireRepo.rejectOpportunity(request.params.id, request.body?.reason);
    if (success) {
      reply.status(204);
      return;
    } else {
      reply.status(404);
      return { error: 'Opportunity not found' };
    }
  });
};