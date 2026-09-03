import {
  createRecipeInputSchema,
  normalizeForSearch,
  updateRecipeInputSchema,
  type CategoryKey,
  type CreateRecipeInput,
  type DifficultyKey,
  type Recipe,
  type RecipeSummary,
  type SeasonKey,
  type UpdateRecipeInput,
} from '@receptari/shared';
import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../../db/client.js';
import { ingredients, recipes, steps } from '../../db/schema.js';
import { NotFoundError } from '../../plugins/error-handler.js';

const idParamSchema = z.object({ id: z.string().uuid() });
const listQuerySchema = z.object({
  q: z.string().trim().optional(),
});

type ListQuery = z.infer<typeof listQuerySchema>;

export class RecipesService {
  constructor(private readonly db: Database) {}

  async list(query: ListQuery = {}): Promise<RecipeSummary[]> {
    const conditions = [];
    if (query.q) {
      conditions.push(ilike(recipes.title, `%${query.q}%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

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
      .orderBy(desc(recipes.createdAt));

    return rows.map((r) => ({
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
    }));
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
