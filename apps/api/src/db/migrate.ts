import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import {
  CREATE_EXTENSIONS_SQL,
  PGLITE_EXTENSIONS,
  PGLITE_PREFIX,
  isPgliteUrl,
  schema,
} from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, '..', '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL no definit (revisa apps/api/.env)');
    process.exit(1);
  }

  const folder = resolve(__dirname, '..', '..', 'drizzle');

  if (isPgliteUrl(url)) {
    const dataDir = parsePglitePath(url);
    console.log(`🐘 PGlite → ${dataDir ?? '(in-memory)'}`);
    const client = dataDir
      ? new PGlite(dataDir, { extensions: PGLITE_EXTENSIONS })
      : new PGlite({ extensions: PGLITE_EXTENSIONS });
    await client.exec(CREATE_EXTENSIONS_SQL);
    const db = drizzlePglite(client, { schema });
    await migratePglite(db, { migrationsFolder: folder });
    await client.close();
    console.log('✅ Migracions aplicades');
    return;
  }

  console.log(`🐘 Postgres → ${url.replace(/:[^:@/]+@/, ':***@')}`);
  const client = postgres(url, { max: 1 });
  await client.unsafe(CREATE_EXTENSIONS_SQL);
  const db = drizzlePostgres(client, { schema });
  await migratePostgres(db, { migrationsFolder: folder });
  await client.end();
  console.log('✅ Migracions aplicades');
}

function parsePglitePath(url: string): string | undefined {
  const raw = url.slice(PGLITE_PREFIX.length);
  if (!raw || raw === 'memory' || raw === ':memory:') return undefined;
  if (raw.startsWith('./')) return raw;
  if (raw.startsWith('/')) return raw;
  return `./${raw}`;
}

main().catch((err) => {
  console.error('❌ Error aplicant migracions:', err);
  process.exit(1);
});
