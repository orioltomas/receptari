import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';
import { loadEnv, type Env } from './config/env.js';
import { createDb, type Database } from './db/client.js';
import dbPlugin from './plugins/db.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import healthRoutes from './modules/health.routes.js';
import recipesRoutes from './modules/recipes/recipes.routes.js';

export interface BuildAppOptions {
  env?: Env;
  db?: Database;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv();

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });

  await app.register(fastifySensible);
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  });
  await app.register(errorHandlerPlugin);

  const db = options.db ?? createDb(env.DATABASE_URL);
  await app.register(dbPlugin, { db });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(recipesRoutes, { prefix: '/api' });

  return app;
}
