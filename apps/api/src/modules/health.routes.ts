import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
};

export default healthRoutes;
