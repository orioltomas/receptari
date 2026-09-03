import {
  createRecipeInputSchema,
  listRecipesQuerySchema,
  normalizeForSearch,
  updateRecipeInputSchema,
  type CategoryKey,
  type CreateRecipeInput,
  type DifficultyKey,
  type Recipe,
  type RecipeListResponse,
  type SeasonKey,
  type UpdateRecipeInput,
} from '@receptari/shared';
import { and, asc, count, desc, eq, ilike, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../../db/client.js';
import { ingredients, recipes, steps } from '../../db/schema.js';
import { NotFoundError } from '../../plugins/error-handler.js';

const idParamSchema = z.object({ id: z.string().uuid() });

/**
 * Total minutes of a recipe: a null part counts as 0. A recipe with both parts
 * null falls outside every time bucket — an unfilled time is unknown, not
 * zero — which is what the `hasAnyTime` guard below enforces.
 */
const totalMinutes = sql<number>`(coalesce(${recipes.prepTimeMinutes}, 0) + coalesce(${recipes.cookTimeMinutes}, 0))`;
const hasAnyTime = sql`(${recipes.prepTimeMinutes} is not null or ${recipes.cookTimeMinutes} is not null)`;

export class RecipesService {
  constructor(private readonly db: Database) {}

  async list(query: unknown = {}): Promise<RecipeListResponse> {
    // Validation lives in `packages/shared` and is never duplicated locally.
    // Parsed again here so the service does not depend on its caller.
    const { q, category, season, difficulty, time, sort, limit, offset } =
      listRecipesQuerySchema.parse(query ?? {});

    const conditions: SQL[] = [];

    // HR-005: search covers the title and the ingredient names, both already
    // normalised into `search_text`. Every word must match one of them.
    if (q) {
      for (const word of normalizeForSearch(q).split(/\s+/).filter(Boolean)) {
        conditions.push(ilike(recipes.searchText, `%${escapeLike(word)}%`));
      }
    }

    if (category) conditions.push(eq(recipes.category, category));
    if (season) conditions.push(eq(recipes.season, season));
    if (difficulty) conditions.push(eq(recipes.difficulty, difficulty));

    if (time === 'lt30') {
      conditions.push(sql`${hasAnyTime} and ${totalMinutes} < 30`);
    } else if (time === '30to60') {
      conditions.push(sql`${hasAnyTime} and ${totalMinutes} >= 30 and ${totalMinutes} <= 60`);
    } else if (time === 'gt60') {
      conditions.push(sql`${hasAnyTime} and ${totalMinutes} > 60`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy =
      sort === 'alpha'
        ? [asc(recipes.title), asc(recipes.id)]
        : sort === 'prep'
          ? [sql`${recipes.prepTimeMinutes} asc nulls last`, asc(recipes.id)]
          : [desc(recipes.createdAt), asc(recipes.id)];

    // `total` gets its own query over `recipes` without the ingredients join:
    // counting join rows would inflate it.
    const [totalRow] = await this.db
      .select({ value: count() })
      .from(recipes)
      .where(where);

    const rows = await this.db
      .select({
        id: recipes.id,
        title: recipes.title,
        description: recipes.description,
        prepTimeMinutes: recipes.prepTimeMinutes,
        cookTimeMinutes: recipes.cookTimeMinutes,
        servings: recipes.servings,
        category: recipes.category,
        season: recipes.season,
        difficulty: recipes.difficulty,
        createdAt: recipes.createdAt,
        updatedAt: recipes.updatedAt,
        ingredientCount: count(ingredients.id),
      })
      .from(recipes)
      .leftJoin(ingredients, eq(ingredients.recipeId, recipes.id))
      .where(where)
      .groupBy(recipes.id)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        prepTimeMinutes: r.prepTimeMinutes,
        cookTimeMinutes: r.cookTimeMinutes,
        servings: r.servings,
        category: r.category as CategoryKey,
        season: r.season as SeasonKey | null,
        difficulty: r.difficulty as DifficultyKey | null,
        ingredientCount: Number(r.ingredientCount ?? 0),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total: Number(totalRow?.value ?? 0),
    };
  }

  async getById(id: string): Promise<Recipe> {
    const { id: recipeId } = idParamSchema.parse({ id });

    const recipe = await this.db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
      with: {
        ingredients: {
          orderBy: (i, { asc: a }) => [a(i.position)],
        },
        steps: {
          orderBy: (s, { asc: a }) => [a(s.position)],
        },
      },
    });

    if (!recipe) {
      throw new NotFoundError(`Recepta ${recipeId} no trobada`);
    }

    return mapRecipe(recipe);
  }

  async create(input: CreateRecipeInput): Promise<Recipe> {
    const data = createRecipeInputSchema.parse(input);

    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(recipes)
        .values({
          title: data.title,
          description: data.description,
          notes: data.notes,
          prepTimeMinutes: data.prepTimeMinutes,
          cookTimeMinutes: data.cookTimeMinutes,
          servings: data.servings,
          category: data.category,
          season: data.season,
          difficulty: data.difficulty,
          searchText: buildSearchText(data.title, data.ingredients),
        })
        .returning();

      if (!inserted) {
        throw new Error('No s\'ha pogut crear la recepta');
      }

      await tx.insert(ingredients).values(
        data.ingredients.map((ing, idx) => ({
          recipeId: inserted.id,
          name: ing.name,
          quantity: ing.quantity?.toString() ?? null,
          unit: ing.unit,
          position: idx,
        })),
      );

      await tx.insert(steps).values(
        data.steps.map((step, idx) => ({
          recipeId: inserted.id,
          title: step.title,
          instruction: step.instruction,
          durationMinutes: step.durationMinutes,
          position: idx,
        })),
      );

      const created = await tx.query.recipes.findFirst({
        where: eq(recipes.id, inserted.id),
        with: {
          ingredients: { orderBy: (i, { asc: a }) => [a(i.position)] },
          steps: { orderBy: (s, { asc: a }) => [a(s.position)] },
        },
      });

      if (!created) {
        throw new Error('Recepta creada però no recuperable');
      }

      return mapRecipe(created);
    });
  }

  async update(id: string, input: UpdateRecipeInput): Promise<Recipe> {
    const { id: recipeId } = idParamSchema.parse({ id });
    const data = updateRecipeInputSchema.parse(input);

    return this.db.transaction(async (tx) => {
      const existing = await tx.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
      });

      if (!existing) {
        throw new NotFoundError(`Recepta ${recipeId} no trobada`);
      }

      await tx
        .update(recipes)
        .set({
          title: data.title,
          description: data.description,
          notes: data.notes,
          prepTimeMinutes: data.prepTimeMinutes,
          cookTimeMinutes: data.cookTimeMinutes,
          servings: data.servings,
          category: data.category,
          season: data.season,
          difficulty: data.difficulty,
          searchText: buildSearchText(data.title, data.ingredients),
          updatedAt: new Date(),
        })
        .where(eq(recipes.id, recipeId));

      await tx.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
      await tx.delete(steps).where(eq(steps.recipeId, recipeId));

      await tx.insert(ingredients).values(
        data.ingredients.map((ing, idx) => ({
          recipeId,
          name: ing.name,
          quantity: ing.quantity?.toString() ?? null,
          unit: ing.unit,
          position: idx,
        })),
      );

      await tx.insert(steps).values(
        data.steps.map((step, idx) => ({
          recipeId,
          title: step.title,
          instruction: step.instruction,
          durationMinutes: step.durationMinutes,
          position: idx,
        })),
      );

      const updated = await tx.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
        with: {
          ingredients: { orderBy: (i, { asc: a }) => [a(i.position)] },
          steps: { orderBy: (s, { asc: a }) => [a(s.position)] },
        },
      });

      if (!updated) {
        throw new NotFoundError(`Recepta ${recipeId} no trobada`);
      }

      return mapRecipe(updated);
    });
  }

  async remove(id: string): Promise<void> {
    const { id: recipeId } = idParamSchema.parse({ id });
    const result = await this.db.delete(recipes).where(eq(recipes.id, recipeId)).returning();
    if (result.length === 0) {
      throw new NotFoundError(`Recepta ${recipeId} no trobada`);
    }
  }
}

/** ILIKE wildcards must not come from user-typed text. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * `recipes.search_text`: el títol normalitzat més el nom normalitzat de cada
 * ingredient, units per espais (HR-005). Es reescriu dins la mateixa
 * transacció a cada create i update.
 */
function buildSearchText(title: string, ings: Array<{ name: string }>): string {
  return [title, ...ings.map((i) => i.name)]
    .map((part) => normalizeForSearch(part))
    .join(' ')
    .trim();
}

function mapRecipe(row: {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  category: string;
  season: string | null;
  difficulty: string | null;
  createdAt: Date;
  updatedAt: Date;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: string | null;
    unit: string | null;
    position: number;
  }>;
  steps: Array<{
    id: string;
    position: number;
    title: string | null;
    instruction: string;
    durationMinutes: number | null;
  }>;
}): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    notes: row.notes,
    prepTimeMinutes: row.prepTimeMinutes,
    cookTimeMinutes: row.cookTimeMinutes,
    servings: row.servings,
    category: row.category as CategoryKey,
    season: row.season as SeasonKey | null,
    difficulty: row.difficulty as DifficultyKey | null,
    ingredients: row.ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity != null ? Number(i.quantity) : null,
      unit: i.unit,
      position: i.position,
    })),
    steps: row.steps.map((s) => ({
      id: s.id,
      position: s.position,
      title: s.title,
      instruction: s.instruction,
      durationMinutes: s.durationMinutes,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
