import type { SeasonKey } from '@receptari/shared';

export interface SeasonOption {
  key: SeasonKey;
  label: string;
  icon: string;
  tone: 'spring' | 'summer' | 'autumn' | 'winter';
}

export const SEASON_OPTIONS: SeasonOption[] = [
  { key: 'spring', label: 'Primavera', icon: 'local_florist', tone: 'spring' },
  { key: 'summer', label: 'Estiu', icon: 'sunny', tone: 'summer' },
  { key: 'autumn', label: 'Tardor', icon: 'energy_savings_leaf', tone: 'autumn' },
  { key: 'winter', label: 'Hivern', icon: 'ac_unit', tone: 'winter' },
];

export function currentSeason(date: Date = new Date()): SeasonKey {
  const month = date.getMonth();
  if (month >= 8 && month <= 10) return 'autumn';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 2 && month <= 4) return 'spring';
  return 'winter';
}

/** "200g" → { quantity: 200, unit: "g" }; "Una cullerada" → { quantity: null, unit: "Una cullerada" } */
export function parseQuantityInput(raw: string): { quantity: number | null; unit: string | null } {
  const value = raw.trim();
  if (!value) return { quantity: null, unit: null };
  const match = value.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (match) {
    const quantity = Number(match[1]!.replace(',', '.'));
    const unit = match[2]?.trim() || null;
    return {
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
      unit,
    };
  }
  return { quantity: null, unit: value };
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
  return total >= 60 ? `${Math.floor(total / 60)} h ${total % 60 > 0 ? `${total % 60} min` : ''}`.trim() : `${total} min`;
}
