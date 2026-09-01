import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { type PgDatabase, type PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * Tipus abstracte compatible tant amb PGlite com amb postgres-js.
 * Permet canviar de driver sense tocar els consumers (serveis, plugins, etc.).
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export const PGLITE_PREFIX = 'pglite://';

export function isPgliteUrl(url: string): boolean {
  return url.startsWith(PGLITE_PREFIX);
}

/**
 * Crea una instància de Drizzle segons el DATABASE_URL.
 *
 * Formats suportats:
 *  - `pglite://./data/receptari.db` → PGlite amb persistència a fitxer
 *  - `pglite://`                    → PGlite in-memory (les dades es perden en tancar)
 *  - `postgres://...` / `postgresql://...` → postgres-js (Postgres real)
 */
export function createDb(databaseUrl: string): Database {
  if (isPgliteUrl(databaseUrl)) {
    const dataDir = parsePglitePath(databaseUrl);
    const client = dataDir ? new PGlite(dataDir) : new PGlite();
    return drizzlePglite(client, { schema }) as unknown as Database;
  }

  const client = postgres(databaseUrl, { max: 10 });
  return drizzlePostgres(client, { schema }) as unknown as Database;
}

function parsePglitePath(url: string): string | undefined {
  const raw = url.slice(PGLITE_PREFIX.length);
  if (!raw || raw === 'memory' || raw === ':memory:') return undefined;
  if (raw.startsWith('./')) return raw;
  if (raw.startsWith('/')) return raw;
  return `./${raw}`;
}

/** Tipus PGlite concret, útil per a tests o scripts específics. */
export type PgliteDb = PgliteDatabase<typeof schema>;
/** Tipus postgres-js concret, útil per a scripts específics. */
export type PostgresJsDb = PostgresJsDatabase<typeof schema>;

export { schema };
