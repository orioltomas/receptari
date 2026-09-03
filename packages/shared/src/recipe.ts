import { z } from 'zod';

export const ingredientSchema = z.object({
  name: z.string().min(1, 'El nom és obligatori').max(200),
  quantity: z.number().positive().nullable().default(null),
  unit: z.string().max(20).nullable().default(null),
  position: z.number().int().nonnegative(),
});

export const ingredientWithIdSchema = ingredientSchema.extend({
  id: z.string().uuid(),
});

export const stepSchema = z.object({
  position: z.number().int().nonnegative(),
  instruction: z.string().min(1, 'La instrucció és obligatòria'),
});

export const stepWithIdSchema = stepSchema.extend({
  id: z.string().uuid(),
});

export const tagSchema = z.string().trim().min(1).max(20);

export const recipeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  prepTimeMinutes: z.number().int().nonnegative().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().nullable(),
  servings: z.number().int().positive().nullable(),
  imageUrl: z.string().url().max(2000).nullable(),
  isFavorite: z.boolean().default(false),
  tags: z.array(tagSchema).default([]),
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
  imageUrl: z.string().url().max(2000).nullable(),
  isFavorite: z.boolean().default(false),
  tags: z.array(tagSchema).default([]),
  ingredientCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createRecipeInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
  prepTimeMinutes: z.number().int().nonnegative().nullable().default(null),
  cookTimeMinutes: z.number().int().nonnegative().nullable().default(null),
  servings: z.number().int().positive().nullable().default(null),
  imageUrl: z.string().url().max(2000).nullable().default(null),
  isFavorite: z.boolean().default(false),
  tags: z.array(tagSchema).max(10).default([]),
  ingredients: z
    .array(ingredientSchema.omit({ position: true }))
    .min(0)
    .default([]),
  steps: z
    .array(stepSchema.omit({ position: true }))
    .min(1, 'Cal com a mínim un pas')
    .default([]),
});

export const updateRecipeInputSchema = createRecipeInputSchema;

export const listRecipesQuerySchema = z.object({
  q: z.string().trim().optional(),
  favorite: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

export const toggleFavoriteInputSchema = z.object({
  isFavorite: z.boolean(),
});

export type Ingredient = z.infer<typeof ingredientSchema>;
export type IngredientWithId = z.infer<typeof ingredientWithIdSchema>;
export type Step = z.infer<typeof stepSchema>;
export type StepWithId = z.infer<typeof stepWithIdSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type RecipeSummary = z.infer<typeof recipeSummarySchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeInputSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeInputSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteInputSchema>;
