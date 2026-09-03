import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREATE_EXTENSIONS_SQL, PGLITE_EXTENSIONS } from '../../src/db/client.js';
import * as schema from '../../src/db/schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export type TestDatabase = PgliteDatabase<typeof schema>;

export async function createTestDb(): Promise<{ db: TestDatabase; close: () => Promise<void> }> {
  const client = new PGlite({ extensions: PGLITE_EXTENSIONS });
  const db = drizzle(client, { schema });

  await runMigrations(client);

  return {
    db,
    close: async () => {
      await client.close();
    },
  };
}

async function runMigrations(client: PGlite): Promise<void> {
  await client.exec(CREATE_EXTENSIONS_SQL);

  const migrationsDir = join(__dirname, '..', '..', 'drizzle');
  let files: string[] = [];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    files = [];
  }

  if (files.length === 0) {
    await applyInlineSchema(client);
    return;
  }

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    await client.exec(sql);
  }
}

async function applyInlineSchema(client: PGlite): Promise<void> {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title varchar(200) NOT NULL,
      description text,
      notes text,
      prep_time_minutes integer,
      cook_time_minutes integer,
      servings integer,
      category varchar(20) NOT NULL,
      season varchar(20),
      difficulty varchar(20),
      search_text text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS recipes_created_at_idx ON recipes (created_at);
    CREATE INDEX IF NOT EXISTS recipes_category_idx ON recipes (category);
    CREATE INDEX IF NOT EXISTS recipes_title_idx ON recipes (title);
    CREATE INDEX IF NOT EXISTS recipes_search_text_trgm_idx ON recipes USING gin (search_text gin_trgm_ops);

    CREATE TABLE IF NOT EXISTS ingredients (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      name varchar(200) NOT NULL,
      quantity numeric(12, 4),
      unit varchar(60),
      position integer NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ingredients_recipe_position_idx ON ingredients (recipe_id, position);

    CREATE TABLE IF NOT EXISTS steps (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      position integer NOT NULL,
      title varchar(120),
      instruction text NOT NULL,
      duration_minutes integer
    );
    CREATE INDEX IF NOT EXISTS steps_recipe_position_idx ON steps (recipe_id, position);
  `);
}
