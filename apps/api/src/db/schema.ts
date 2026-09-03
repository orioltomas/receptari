import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    notes: text('notes'),
    prepTimeMinutes: integer('prep_time_minutes'),
    cookTimeMinutes: integer('cook_time_minutes'),
    servings: integer('servings'),
    category: varchar('category', { length: 20 }).notNull(),
    season: varchar('season', { length: 20 }),
    difficulty: varchar('difficulty', { length: 20 }),
    searchText: text('search_text').default('').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('recipes_created_at_idx').on(t.createdAt),
    index('recipes_category_idx').on(t.category),
    index('recipes_title_idx').on(t.title),
    index('recipes_search_text_trgm_idx').using('gin', sql`${t.searchText} gin_trgm_ops`),
  ],
);

export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 4 }),
    unit: varchar('unit', { length: 60 }),
    position: integer('position').notNull(),
  },
  (t) => [index('ingredients_recipe_position_idx').on(t.recipeId, t.position)],
);

export const steps = pgTable(
  'steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: varchar('title', { length: 120 }),
    instruction: text('instruction').notNull(),
    durationMinutes: integer('duration_minutes'),
  },
  (t) => [index('steps_recipe_position_idx').on(t.recipeId, t.position)],
);

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(ingredients),
  steps: many(steps),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, { fields: [ingredients.recipeId], references: [recipes.id] }),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  recipe: one(recipes, { fields: [steps.recipeId], references: [recipes.id] }),
}));

export type RecipeRow = typeof recipes.$inferSelect;
export type IngredientRow = typeof ingredients.$inferSelect;
export type StepRow = typeof steps.$inferSelect;
