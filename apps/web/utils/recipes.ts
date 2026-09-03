import {
  CATEGORY_KEYS,
  DIFFICULTY_KEYS,
  SEASON_KEYS,
  type CategoryKey,
  type DifficultyKey,
  type SeasonKey,
} from '@receptari/shared';

/**
 * The database stores stable keys; the Catalan wording lives here and may
 * change without a migration. Every table is a total `Record` over the key
 * union exported by `@receptari/shared`, so adding a key there without a label
 * here is a type error rather than a silently blank chip.
 */

/** Short labels for filter chips and recipe cards. */
export const CATEGORY_SHORT_LABELS: Readonly<Record<CategoryKey, string>> = {
  breakfast: 'Esmorzars',
  lunch: 'Dinars',
  dinner: 'Sopars',
  dessert: 'Postres',
  snack: 'Pica-pica',
  bread: 'Pa i Masses',
};

/** Longer, descriptive labels for the add/edit form. */
export const CATEGORY_LONG_LABELS: Readonly<Record<CategoryKey, string>> = {
  breakfast: 'Esmorzar · Brunch',
  lunch: 'Dinar principal',
  dinner: 'Sopar de repòs',
  dessert: 'Postres · Dolç',
  snack: 'Pica-pica',
  bread: 'Pa · Forn artesà',
};

export const SEASON_LABELS: Readonly<Record<SeasonKey, string>> = {
  spring: 'Primavera',
  summer: 'Estiu',
  autumn: 'Tardor',
  winter: 'Hivern',
  all_year: "Tot l'any",
};

export const DIFFICULTY_LABELS: Readonly<Record<DifficultyKey, string>> = {
  easy: 'Fàcil',
  medium: 'Mitjana',
  hard: 'Avançada',
};

export function categoryShortLabel(key: CategoryKey): string {
  return CATEGORY_SHORT_LABELS[key];
}

export function categoryLongLabel(key: CategoryKey): string {
  return CATEGORY_LONG_LABELS[key];
}

export function seasonLabel(key: SeasonKey): string {
  return SEASON_LABELS[key];
}

export function difficultyLabel(key: DifficultyKey): string {
  return DIFFICULTY_LABELS[key];
}

export interface CategoryOption {
  key: CategoryKey;
  shortLabel: string;
  longLabel: string;
}

/** Built from the shared key array so the order and the set follow the schema. */
export const CATEGORY_OPTIONS: readonly CategoryOption[] = CATEGORY_KEYS.map((key) => ({
  key,
  shortLabel: CATEGORY_SHORT_LABELS[key],
  longLabel: CATEGORY_LONG_LABELS[key],
}));

export interface SeasonOption {
  key: SeasonKey;
  label: string;
  icon: string;
  tone: SeasonKey;
}

const SEASON_ICONS: Readonly<Record<SeasonKey, string>> = {
  spring: 'local_florist',
  summer: 'sunny',
  autumn: 'energy_savings_leaf',
  winter: 'ac_unit',
  all_year: 'calendar_month',
};

export const SEASON_OPTIONS: readonly SeasonOption[] = SEASON_KEYS.map((key) => ({
  key,
  label: SEASON_LABELS[key],
  icon: SEASON_ICONS[key],
  tone: key,
}));

export interface DifficultyOption {
  key: DifficultyKey;
  label: string;
}

export const DIFFICULTY_OPTIONS: readonly DifficultyOption[] = DIFFICULTY_KEYS.map((key) => ({
  key,
  label: DIFFICULTY_LABELS[key],
}));

/** The season we are in now. Never `all_year` — that is a recipe trait, not a date. */
export function currentSeason(date: Date = new Date()): SeasonKey {
  const month = date.getMonth();
  if (month >= 8 && month <= 10) return 'autumn';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 2 && month <= 4) return 'spring';
  return 'winter';
}

/** Matches the `unit` cap in the shared schema. */
export const MAX_UNIT_LENGTH = 60;

export type ParsedQuantityProblem = 'quantity-not-positive' | 'unit-too-long';

export type ParsedQuantity =
  /** Nothing was typed at all. */
  | { status: 'empty' }
  /** Usable input. A `null` quantity means "al gust", not a lost value. */
  | { status: 'ok'; quantity: number | null; unit: string | null }
  /** Something was typed but cannot be stored. The caller must tell the user. */
  | { status: 'invalid'; problem: ParsedQuantityProblem; message: string; input: string };

const PROBLEM_MESSAGES: Readonly<Record<ParsedQuantityProblem, string>> = {
  'quantity-not-positive': 'La quantitat ha de ser més gran que zero.',
  'unit-too-long': `La unitat no pot passar dels ${MAX_UNIT_LENGTH} caràcters.`,
};

function invalid(problem: ParsedQuantityProblem, input: string): ParsedQuantity {
  return { status: 'invalid', problem, message: PROBLEM_MESSAGES[problem], input };
}

/**
 * Reads the single "quantity" field of an ingredient row.
 *
 * "200g" → 200 + "g"; "Una cullerada" → no quantity, unit "Una cullerada".
 * Typed input is never silently dropped: a quantity that is not greater than
 * zero, or a unit past the stored cap, comes back as `invalid` with a message
 * instead of quietly becoming `null`.
 */
export function parseQuantityInput(raw: string): ParsedQuantity {
  const value = raw.trim();
  if (!value) return { status: 'empty' };

  const match = value.match(/^(-?\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (match) {
    const quantity = Number(match[1]!.replace(',', '.'));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return invalid('quantity-not-positive', value);
    }
    const unit = match[2]?.trim() || null;
    if (unit && unit.length > MAX_UNIT_LENGTH) {
      return invalid('unit-too-long', value);
    }
    return { status: 'ok', quantity, unit };
  }

  if (value.length > MAX_UNIT_LENGTH) {
    return invalid('unit-too-long', value);
  }
  return { status: 'ok', quantity: null, unit: value };
}

/**
 * Scales a stored quantity from the recipe's own servings to a target count.
 * Display only — the scaled value is never saved. A `null` quantity ("al
 * gust") never scales, and unknown or non-positive servings leave the quantity
 * untouched rather than inventing a factor.
 */
export function scaleQuantity(
  quantity: number | null,
  baseServings: number | null | undefined,
  targetServings: number | null | undefined,
): number | null {
  if (quantity == null) return null;
  if (baseServings == null || targetServings == null) return quantity;
  if (baseServings <= 0 || targetServings <= 0) return quantity;
  if (baseServings === targetServings) return quantity;
  return roundQuantity((quantity * targetServings) / baseServings);
}

/**
 * Two decimals is enough for a kitchen and keeps 0.1 × 3 from rendering as
 * 0.30000000000000004.
 */
export function roundQuantity(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Scales one ingredient. The unit is copied verbatim — never converted. */
export function scaleIngredient<T extends { quantity: number | null; unit: string | null }>(
  ingredient: T,
  baseServings: number | null | undefined,
  targetServings: number | null | undefined,
): T {
  return {
    ...ingredient,
    quantity: scaleQuantity(ingredient.quantity, baseServings, targetServings),
  };
}

export function formatQuantity(quantity: number | null, unit: string | null): string {
  return [quantity, unit].filter((part) => part != null && String(part).length > 0).join(' ');
}

export function formatIngredient(ing: {
  name: string;
  quantity: number | null;
  unit: string | null;
}): string {
  return [formatQuantity(ing.quantity, ing.unit), ing.name]
    .filter((part) => part.length > 0)
    .join(' ');
}

/** input[type=number] pot donar '' — converteix a number|null */
export function numOrNull(value: string | number | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function totalTimeLabel(prep: number | null, cook: number | null): string {
  const total = (prep ?? 0) + (cook ?? 0);
  if (!total) return '—';
  return total >= 60
    ? `${Math.floor(total / 60)} h ${total % 60 > 0 ? `${total % 60} min` : ''}`.trim()
    : `${total} min`;
}
