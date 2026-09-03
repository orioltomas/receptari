import {
  createRecipeInputSchema,
  listRecipesQuerySchema,
  updateRecipeInputSchema,
} from '@receptari/shared';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { HTTP } from '../../plugins/error-handler.js';
import { RecipesService } from './recipes.service.js';

const idParamsSchema = z.object({
  id: z.string().uuid({ message: 'ID invàlid' }),
});

const recipesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const service = new RecipesService(fastify.db);

  fastify.get('/recipes', async (request) => {
    const query = listRecipesQuerySchema.parse(request.query ?? {});
    return service.list(query);
  });

  fastify.get<{ Params: { id: string } }>('/recipes/:id', async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return service.getById(id);
  });

  fastify.post('/recipes', async (request, reply) => {
    const input = createRecipeInputSchema.parse(request.body);
    const created = await service.create(input);
    return reply.status(HTTP.CREATED).send(created);
  });

  fastify.patch<{ Params: { id: string } }>('/recipes/:id', async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateRecipeInputSchema.parse(request.body);
    return service.update(id, input);
  });

  fastify.post<{ Params: { id: string } }>('/recipes/:id/favorite', async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return service.setFavorite(id, request.body);
  });

  fastify.delete<{ Params: { id: string } }>('/recipes/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    await service.remove(id);
    return reply.status(HTTP.NO_CONTENT).send();
  });
};

export default recipesRoutes;
