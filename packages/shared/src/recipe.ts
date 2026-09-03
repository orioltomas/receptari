import { z } from 'zod';

/**
 * Claus estables de classificació. Mai s'hi guarda l'etiqueta
 * catalana: les etiquetes són presentació i viuen a l'app web.
 */
export const CATEGORY_KEYS = [
  'breakfast',
  'lunch',
  'dinner',
  'dessert',
  'snack',
  'bread',
] as const;

export const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter', 'all_year'] as const;

export const DIFFICULTY_KEYS = ['easy', 'medium', 'hard'] as const;

export const categorySchema = z.enum(CATEGORY_KEYS);
export const seasonSchema = z.enum(SEASON_KEYS);
export const difficultySchema = z.enum(DIFFICULTY_KEYS);

export const ingredientSchema = z.object({
  name: z.string().min(1, 'El nom és obligatori').max(200),
  quantity: z.number().positive().nullable().default(null),
  // Text lliure sense vocabulari controlat, però limitat a 60 caràcters.
  unit: z.string().max(60).nullable().default(null),
  position: z.number().int().nonnegative(),
});

export const ingredientWithIdSchema = ingredientSchema.extend({
  id: z.string().uuid(),
});

export const stepSchema = z.object({
  position: z.number().int().nonnegative(),
  title: z.string().max(120).nullable().default(null),
  instruction: z.string().min(1, 'La instrucció és obligatòria'),
  durationMinutes: z.number().int().nonnegative().nullable().default(null),
});

export const stepWithIdSchema = stepSchema.extend({
  id: z.string().uuid(),
});

export const recipeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  prepTimeMinutes: z.number().int().nonnegative().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().nullable(),
  servings: z.number().int().positive().nullable(),
  category: categorySchema,
  season: seasonSchema.nullable(),
  difficulty: difficultySchema.nullable(),
  ingredients: z.array(ingredientWithIdSchema),
  steps: z.array(stepWithIdSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const recipeSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  prepTimeMinutes: z.number().int().nonnegative().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().nullable(),
  servings: z.number().int().positive().nullable(),
  category: categorySchema,
  season: seasonSchema.nullable(),
  difficulty: difficultySchema.nullable(),
  ingredientCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createRecipeInputSchema = z.object({
  title: z.string().min(1).max(200),
  // El límit de 2000 caràcters és una decisió de producte: viu aquí i
  // mai com a restricció de la columna.
  description: z.string().max(2000).nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
  prepTimeMinutes: z.number().int().nonnegative().nullable().default(null),
  cookTimeMinutes: z.number().int().nonnegative().nullable().default(null),
  servings: z.number().int().positive().nullable().default(null),
  category: categorySchema,
  season: seasonSchema.nullable().default(null),
  difficulty: difficultySchema.nullable().default(null),
  ingredients: z
    .array(ingredientSchema.omit({ position: true }))
    .min(1, 'Cal com a mínim un ingredient')
    .default([]),
  steps: z
    .array(stepSchema.omit({ position: true }))
    .min(1, 'Cal com a mínim un pas')
    .default([]),
});

// Desar una recepta la substitueix sencera, sense excepcions.
export const updateRecipeInputSchema = createRecipeInputSchema;

export const listRecipesQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: categorySchema.optional(),
  season: seasonSchema.optional(),
  difficulty: difficultySchema.optional(),
  time: z.enum(['lt30', '30to60', 'gt60']).optional(),
  sort: z.enum(['recent', 'alpha', 'prep']).default('recent'),
  limit: z.coerce.number().int().min(1).max(50).default(6),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const recipeListResponseSchema = z.object({
  items: z.array(recipeSummarySchema),
  total: z.number().int().nonnegative(),
});

export type CategoryKey = z.infer<typeof categorySchema>;
export type SeasonKey = z.infer<typeof seasonSchema>;
export type DifficultyKey = z.infer<typeof difficultySchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type IngredientWithId = z.infer<typeof ingredientWithIdSchema>;
export type Step = z.infer<typeof stepSchema>;
export type StepWithId = z.infer<typeof stepWithIdSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type RecipeSummary = z.infer<typeof recipeSummarySchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeInputSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeInputSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
export type RecipeListResponse = z.infer<typeof recipeListResponseSchema>;
