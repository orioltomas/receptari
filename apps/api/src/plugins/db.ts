import type { Database } from '../db/client.js';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

const dbPlugin: FastifyPluginAsync<{ db: Database }> = async (
  fastify: FastifyInstance,
  opts,
) => {
  fastify.decorate('db', opts.db);
};

export default fp(dbPlugin, { name: 'db' });
