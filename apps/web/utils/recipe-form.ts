import type {
  CategoryKey,
  CreateRecipeInput,
  DifficultyKey,
  Recipe,
  SeasonKey,
} from '@receptari/shared';

import { MAX_UNIT_LENGTH, numOrNull, parseQuantityInput } from './recipes';

/**
 * The add/edit form's state, validation and draft storage.
 *
 * It lives outside the `.vue` file on purpose: the component is then a thin
 * shell over plain functions that can be tested without a DOM or a renderer.
 */

/** `description` and `notes` share this cap with the shared schema. */
export const MAX_TEXT_LENGTH = 2000;

/**
 * Suggestions only. The unit is free text with no controlled vocabulary, so
 * anything the user types is accepted as long as it fits the stored cap —
 * these are rendered through a `<datalist>`, never a closed `<select>`.
 */
export const UNIT_SUGGESTIONS: readonly string[] = [
  'g',
  'ml',
  'unitats',
  'cullerada sopera',
  'culleradeta',
  'pessic',
  'branqueta',
  'litres',
];

export interface IngredientDraft {
  /** Free text: "200", "200 g", "al gust". Read by `parseQuantityInput`. */
  quantityText: string;
  /** Free text with suggestions. Wins over a unit typed in `quantityText`. */
  unitText: string;
  name: string;
}

export interface StepDraft {
  title: string;
  instruction: string;
  durationText: string;
}

export interface RecipeFormState {
  title: string;
  description: string;
  notes: string;
  prepTimeText: string;
  cookTimeText: string;
  servingsText: string;
  /** Empty until chosen — the category is required, so there is no default. */
  category: CategoryKey | '';
  season: SeasonKey | null;
  difficulty: DifficultyKey | null;
  ingredients: IngredientDraft[];
  steps: StepDraft[];
}

export function emptyIngredient(): IngredientDraft {
  return { quantityText: '', unitText: '', name: '' };
}

export function emptyStep(): StepDraft {
  return { title: '', instruction: '', durationText: '' };
}

export function emptyFormState(): RecipeFormState {
  return {
    title: '',
    description: '',
    notes: '',
    prepTimeText: '',
    cookTimeText: '',
    servingsText: '',
    category: '',
    season: null,
    difficulty: null,
    ingredients: [emptyIngredient()],
    steps: [emptyStep()],
  };
}

function textOf(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

/**
 * Hydrates the form from a stored recipe. Every editable field round-trips,
 * including the optional step title and duration. `position` is deliberately
 * dropped: the API derives it from array order, so the array *is* the order.
 */
export function formStateFromRecipe(recipe: Recipe): RecipeFormState {
  return {
    title: recipe.title,
    description: recipe.description ?? '',
    notes: recipe.notes ?? '',
    prepTimeText: textOf(recipe.prepTimeMinutes),
    cookTimeText: textOf(recipe.cookTimeMinutes),
    servingsText: textOf(recipe.servings),
    category: recipe.category,
    season: recipe.season,
    difficulty: recipe.difficulty,
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((ing) => ({
          quantityText: textOf(ing.quantity),
          unitText: ing.unit ?? '',
          name: ing.name,
        }))
      : [emptyIngredient()],
    steps: recipe.steps.length
      ? recipe.steps.map((step) => ({
          title: step.title ?? '',
          instruction: step.instruction,
          durationText: textOf(step.durationMinutes),
        }))
      : [emptyStep()],
  };
}

export type IngredientRowProblem =
  | 'quantity-not-positive'
  | 'unit-too-long'
  | 'unit-conflict'
  | 'name-missing';

export type ResolvedIngredientRow =
  /** The row is untouched and will simply be dropped. */
  | { status: 'empty' }
  | { status: 'ok'; name: string; quantity: number | null; unit: string | null }
  | { status: 'invalid'; problem: IngredientRowProblem; message: string };

const ROW_MESSAGES: Readonly<Record<'unit-conflict' | 'name-missing', string>> = {
  'unit-conflict':
    'Has escrit una unitat a la quantitat i una altra al camp d’unitat. Deixa’n només una.',
  'name-missing': 'Falta el nom de l’ingredient.',
};

/**
 * Turns one ingredient row into what the API stores, or into a message.
 *
 * Nothing typed is ever dropped in silence: a quantity that is not greater
 * than zero, a unit past the cap, a unit given twice with two different
 * values, or a quantity with no ingredient name all come back as `invalid`.
 * A row where the quantity box carries the unit ("al gust", "un pessic") is
 * fine — that unit is used when the unit box is empty.
 */
export function resolveIngredientRow(row: IngredientDraft): ResolvedIngredientRow {
  const name = row.name.trim();
  const unitField = row.unitText.trim();
  const parsed = parseQuantityInput(row.quantityText);

  if (parsed.status === 'invalid') {
    return { status: 'invalid', problem: parsed.problem, message: parsed.message };
  }
  if (unitField.length > MAX_UNIT_LENGTH) {
    return {
      status: 'invalid',
      problem: 'unit-too-long',
      message: `La unitat no pot passar dels ${MAX_UNIT_LENGTH} caràcters.`,
    };
  }

  const quantity = parsed.status === 'ok' ? parsed.quantity : null;
  const parsedUnit = parsed.status === 'ok' ? parsed.unit : null;

  if (parsedUnit && unitField && parsedUnit !== unitField) {
    return {
      status: 'invalid',
      problem: 'unit-conflict',
      message: ROW_MESSAGES['unit-conflict'],
    };
  }

  const unit = unitField || parsedUnit;

  if (!name) {
    if (quantity == null && !unit) return { status: 'empty' };
    return { status: 'invalid', problem: 'name-missing', message: ROW_MESSAGES['name-missing'] };
  }

  return { status: 'ok', name, quantity, unit };
}

export type StepRowProblem = 'instruction-missing';

export type ResolvedStepRow =
  | { status: 'empty' }
  | { status: 'ok'; title: string | null; instruction: string; durationMinutes: number | null }
  | { status: 'invalid'; problem: StepRowProblem; message: string };

/** Same contract as the ingredient rows: a half-filled step is reported. */
export function resolveStepRow(row: StepDraft): ResolvedStepRow {
  const title = row.title.trim();
  const instruction = row.instruction.trim();
  const duration = numOrNull(row.durationText.trim());

  if (!instruction) {
    if (!title && duration == null) return { status: 'empty' };
    return {
      status: 'invalid',
      problem: 'instruction-missing',
      message: 'Falta la instrucció d’aquest pas.',
    };
  }

  return {
    status: 'ok',
    title: title || null,
    instruction,
    durationMinutes: duration,
  };
}

export interface FormErrors {
  title?: string;
  category?: string;
  description?: string;
  notes?: string;
  ingredients?: string;
  steps?: string;
  /** Keyed by row index, so the message renders next to the offending row. */
  ingredientRows: Record<number, string>;
  stepRows: Record<number, string>;
}

export type ValidationResult =
  | { ok: true; payload: CreateRecipeInput }
  | { ok: false; errors: FormErrors; summary: string };

export function hasErrors(errors: FormErrors): boolean {
  return (
    Boolean(
      errors.title ||
        errors.category ||
        errors.description ||
        errors.notes ||
        errors.ingredients ||
        errors.steps,
    ) ||
    Object.keys(errors.ingredientRows).length > 0 ||
    Object.keys(errors.stepRows).length > 0
  );
}

/**
 * Validates the whole form and, when it holds together, builds the complete
 * payload. Saving replaces the recipe wholesale, so the same payload shape
 * serves both the POST and the PATCH.
 */
export function validateForm(state: RecipeFormState): ValidationResult {
  const errors: FormErrors = { ingredientRows: {}, stepRows: {} };

  const title = state.title.trim();
  if (!title) errors.title = 'El títol és obligatori.';
  else if (title.length > 200) errors.title = 'El títol no pot passar dels 200 caràcters.';

  if (!state.category) errors.category = 'Cal triar una categoria.';

  const description = state.description.trim();
  if (description.length > MAX_TEXT_LENGTH) {
    errors.description = `La descripció no pot passar dels ${MAX_TEXT_LENGTH} caràcters.`;
  }

  const notes = state.notes.trim();
  if (notes.length > MAX_TEXT_LENGTH) {
    errors.notes = `Les notes no poden passar dels ${MAX_TEXT_LENGTH} caràcters.`;
  }

  const ingredients: CreateRecipeInput['ingredients'] = [];
  state.ingredients.forEach((row, index) => {
    const resolved = resolveIngredientRow(row);
    if (resolved.status === 'invalid') {
      errors.ingredientRows[index] = resolved.message;
      return;
    }
    if (resolved.status === 'empty') return;
    ingredients.push({
      name: resolved.name,
      quantity: resolved.quantity,
      unit: resolved.unit,
    });
  });
  if (ingredients.length === 0 && Object.keys(errors.ingredientRows).length === 0) {
    errors.ingredients = 'Cal com a mínim un ingredient.';
  }

  const steps: CreateRecipeInput['steps'] = [];
  state.steps.forEach((row, index) => {
    const resolved = resolveStepRow(row);
    if (resolved.status === 'invalid') {
      errors.stepRows[index] = resolved.message;
      return;
    }
    if (resolved.status === 'empty') return;
    steps.push({
      title: resolved.title,
      instruction: resolved.instruction,
      durationMinutes: resolved.durationMinutes,
    });
  });
  if (steps.length === 0 && Object.keys(errors.stepRows).length === 0) {
    errors.steps = 'Cal com a mínim un pas.';
  }

  if (hasErrors(errors)) {
    return { ok: false, errors, summary: 'Revisa els camps marcats abans de desar.' };
  }

  return {
    ok: true,
    payload: {
      title,
      description: description || null,
      notes: notes || null,
      prepTimeMinutes: numOrNull(state.prepTimeText.trim()),
      cookTimeMinutes: numOrNull(state.cookTimeText.trim()),
      servings: numOrNull(state.servingsText.trim()),
      // `category` is non-empty here: the check above would have failed.
      category: state.category as CategoryKey,
      season: state.season,
      difficulty: state.difficulty,
      ingredients,
      steps,
    },
  };
}

/* ------------------------------------------------------------------ drafts */

const DRAFT_PREFIX = 'receptari:recipe-draft';

/**
 * The add form and each recipe's edit form get their own key, so a draft of
 * one can never overwrite the other.
 */
export function draftKeyFor(recipeId: string | null | undefined): string {
  return recipeId ? `${DRAFT_PREFIX}:${recipeId}` : `${DRAFT_PREFIX}:new`;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Browser storage throws in private windows and wherever site data is
 * blocked, and it is only ever a convenience here — every access is guarded
 * and a failure degrades to "no draft" rather than breaking the form.
 */
export function getDraftStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isDraftShape(value: unknown): value is RecipeFormState {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Partial<RecipeFormState>;
  return (
    typeof draft.title === 'string' &&
    typeof draft.description === 'string' &&
    typeof draft.notes === 'string' &&
    Array.isArray(draft.ingredients) &&
    Array.isArray(draft.steps)
  );
}

/** Returns `null` for a missing, unreadable or unrecognisable draft. */
export function readDraft(key: string, storage: StorageLike | null): RecipeFormState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDraftShape(parsed)) return null;
    return { ...emptyFormState(), ...parsed };
  } catch {
    return null;
  }
}

export function writeDraft(key: string, state: RecipeFormState, storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(state));
  } catch {
    /* A full or blocked store just means no draft. Never break the form. */
  }
}

export function clearDraft(key: string, storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* Nothing to do — the draft is a convenience, not state we depend on. */
  }
}

/** A pristine form is not worth persisting, and must not resurrect itself. */
export function isFormStateEmpty(state: RecipeFormState): boolean {
  const empty = emptyFormState();
  return JSON.stringify(state) === JSON.stringify(empty);
}

/** Moves an array item, returning `false` when the target is out of range. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): boolean {
  const target = index + direction;
  if (target < 0 || target >= items.length) return false;
  const item = items[index];
  if (item === undefined) return false;
  items.splice(index, 1);
  items.splice(target, 0, item);
  return true;
}
