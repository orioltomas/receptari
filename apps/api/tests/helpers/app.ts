import { buildApp } from '../../src/app.js';
import { loadEnv } from '../../src/config/env.js';
import type { FastifyInstance } from 'fastify';
import type { TestDatabase } from './db.js';

export async function buildTestApp(db: TestDatabase): Promise<FastifyInstance> {
  const env = loadEnv({
    DATABASE_URL: 'postgres://test',
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    HOST: '127.0.0.1',
    PORT: '0',
    CORS_ORIGIN: 'http://localhost:3001',
  });

  return buildApp({ env, db });
}
