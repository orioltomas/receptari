import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
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

/**
 * Extensions que PGlite ha de carregar. `pg_trgm` es distribueix amb PGlite
 * però només està disponible si es registra en construir el client; l'índex
 * `recipes_search_text_trgm_idx` el necessita.
 */
export const PGLITE_EXTENSIONS = { pg_trgm };

/** DDL que ha d'existir abans d'aplicar les migracions (índex GIN trigram). */
export const CREATE_EXTENSIONS_SQL = 'CREATE EXTENSION IF NOT EXISTS pg_trgm;';

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
    const client = dataDir
      ? new PGlite(dataDir, { extensions: PGLITE_EXTENSIONS })
      : new PGlite({ extensions: PGLITE_EXTENSIONS });
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
