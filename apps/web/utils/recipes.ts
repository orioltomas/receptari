export const SEASONS = ['Primavera', 'Estiu', 'Tardor', 'Hivern'] as const;
export type Season = (typeof SEASONS)[number];

export interface SeasonOption {
  name: Season;
  icon: string;
  tone: 'spring' | 'summer' | 'autumn' | 'winter';
}

export const SEASON_OPTIONS: SeasonOption[] = [
  { name: 'Primavera', icon: 'local_florist', tone: 'spring' },
  { name: 'Estiu', icon: 'sunny', tone: 'summer' },
  { name: 'Tardor', icon: 'energy_savings_leaf', tone: 'autumn' },
  { name: 'Hivern', icon: 'ac_unit', tone: 'winter' },
];

export function currentSeason(date: Date = new Date()): Season {
  const month = date.getMonth();
  if (month >= 8 && month <= 10) return 'Tardor';
  if (month >= 5 && month <= 7) return 'Estiu';
  if (month >= 2 && month <= 4) return 'Primavera';
  return 'Hivern';
}

export function isSeasonTag(tag: string): boolean {
  return SEASONS.some((s) => s.toLowerCase() === tag.trim().toLowerCase());
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

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function tagsMatch(tag: string, filter: string): boolean {
  const t = normalizeText(tag);
  const f = normalizeText(filter);
  return t.includes(f) || f.includes(t);
}

export function totalTimeLabel(prep: number | null, cook: number | null): string {
  const total = (prep ?? 0) + (cook ?? 0);
  if (!total) return '—';
  return total >= 60 ? `${Math.floor(total / 60)} h ${total % 60 > 0 ? `${total % 60} min` : ''}`.trim() : `${total} min`;
}

export function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 20)
    .slice(0, 10);
}
