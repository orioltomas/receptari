import { CATEGORY_KEYS, DIFFICULTY_KEYS, SEASON_KEYS } from '@receptari/shared';
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_LONG_LABELS,
  CATEGORY_OPTIONS,
  CATEGORY_SHORT_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_OPTIONS,
  MAX_UNIT_LENGTH,
  SEASON_LABELS,
  SEASON_OPTIONS,
  categoryLongLabel,
  categoryShortLabel,
  currentSeason,
  difficultyLabel,
  formatIngredient,
  formatQuantity,
  numOrNull,
  parseQuantityInput,
  scaleIngredient,
  scaleQuantity,
  seasonLabel,
  totalTimeLabel,
} from '~/utils/recipes';

describe('etiquetes catalanes', () => {
  it('cada clau compartida té etiqueta', () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_SHORT_LABELS[key]).toBeTruthy();
      expect(CATEGORY_LONG_LABELS[key]).toBeTruthy();
    }
    for (const key of SEASON_KEYS) {
      expect(SEASON_LABELS[key]).toBeTruthy();
    }
    for (const key of DIFFICULTY_KEYS) {
      expect(DIFFICULTY_LABELS[key]).toBeTruthy();
    }
  });

  it('categoria té joc curt i joc llarg', () => {
    expect(categoryShortLabel('bread')).toBe('Pa i Masses');
    expect(categoryLongLabel('bread')).toBe('Pa · Forn artesà');
    expect(categoryShortLabel('dinner')).toBe('Sopars');
    expect(categoryLongLabel('dinner')).toBe('Sopar de repòs');
  });

  it('temporades i dificultats', () => {
    expect(seasonLabel('all_year')).toBe("Tot l'any");
    expect(seasonLabel('autumn')).toBe('Tardor');
    expect(difficultyLabel('hard')).toBe('Avançada');
  });

  it('les llistes segueixen les claus compartides', () => {
    expect(CATEGORY_OPTIONS.map((o) => o.key)).toEqual([...CATEGORY_KEYS]);
    expect(SEASON_OPTIONS.map((o) => o.key)).toEqual([...SEASON_KEYS]);
    expect(DIFFICULTY_OPTIONS.map((o) => o.key)).toEqual([...DIFFICULTY_KEYS]);
    expect(SEASON_OPTIONS.every((o) => o.icon.length > 0)).toBe(true);
  });
});

describe('parseQuantityInput', () => {
  it('separa quantitat numèrica i unitat', () => {
    expect(parseQuantityInput('200g')).toEqual({ status: 'ok', quantity: 200, unit: 'g' });
    expect(parseQuantityInput('1.5 L')).toEqual({ status: 'ok', quantity: 1.5, unit: 'L' });
    expect(parseQuantityInput('2,5 kg')).toEqual({ status: 'ok', quantity: 2.5, unit: 'kg' });
  });

  it('accepta quantitat sense unitat', () => {
    expect(parseQuantityInput('3')).toEqual({ status: 'ok', quantity: 3, unit: null });
  });

  it('text sense número es conserva com a unitat', () => {
    expect(parseQuantityInput('Una cullerada')).toEqual({
      status: 'ok',
      quantity: null,
      unit: 'Una cullerada',
    });
  });

  it('distingeix "res escrit" de "escrit però inservible"', () => {
    expect(parseQuantityInput('   ')).toEqual({ status: 'empty' });

    const zero = parseQuantityInput('0 g');
    expect(zero.status).toBe('invalid');
    if (zero.status !== 'invalid') throw new Error('unreachable');
    expect(zero.problem).toBe('quantity-not-positive');
    expect(zero.input).toBe('0 g');
    expect(zero.message.length).toBeGreaterThan(0);
  });

  it('un zero sol també es reporta, no es converteix en null', () => {
    const result = parseQuantityInput('0');
    expect(result).toMatchObject({ status: 'invalid', problem: 'quantity-not-positive' });
    expect(result).not.toHaveProperty('quantity');
  });

  it('les quantitats negatives es reporten', () => {
    expect(parseQuantityInput('-5 g')).toMatchObject({
      status: 'invalid',
      problem: 'quantity-not-positive',
    });
  });

  it('una unitat de més de 60 caràcters es reporta i no es retalla', () => {
    const longUnit = 'x'.repeat(MAX_UNIT_LENGTH + 1);
    const withQuantity = parseQuantityInput(`2 ${longUnit}`);
    expect(withQuantity).toMatchObject({ status: 'invalid', problem: 'unit-too-long' });
    expect(withQuantity).not.toHaveProperty('unit');

    expect(parseQuantityInput(longUnit)).toMatchObject({
      status: 'invalid',
      problem: 'unit-too-long',
    });
  });

  it('accepta una unitat de 60 caràcters justos', () => {
    const unit = 'x'.repeat(MAX_UNIT_LENGTH);
    expect(parseQuantityInput(`2 ${unit}`)).toEqual({ status: 'ok', quantity: 2, unit });
  });
});

describe('scaleQuantity', () => {
  it('duplica les quantitats d’una recepta de 4 racions', () => {
    expect(scaleQuantity(200, 4, 8)).toBe(400);
    expect(scaleQuantity(1.5, 4, 8)).toBe(3);
  });

  it('redueix proporcionalment', () => {
    expect(scaleQuantity(200, 4, 2)).toBe(100);
    expect(scaleQuantity(100, 3, 1)).toBe(33.33);
  });

  it('no arrossega error de coma flotant', () => {
    expect(scaleQuantity(0.1, 1, 3)).toBe(0.3);
  });

  it('una quantitat nul·la ("al gust") no escala mai', () => {
    expect(scaleQuantity(null, 4, 8)).toBeNull();
  });

  it('sense racions conegudes deixa la quantitat igual', () => {
    expect(scaleQuantity(200, null, 8)).toBe(200);
    expect(scaleQuantity(200, 4, null)).toBe(200);
    expect(scaleQuantity(200, 0, 8)).toBe(200);
    expect(scaleQuantity(200, 4, 0)).toBe(200);
    expect(scaleQuantity(200, 4, 4)).toBe(200);
  });

  it('escala un ingredient sense tocar la unitat ni el nom', () => {
    const ing = { name: 'Farina', quantity: 500, unit: 'g' };
    expect(scaleIngredient(ing, 4, 8)).toEqual({ name: 'Farina', quantity: 1000, unit: 'g' });

    const alGust = { name: 'Sal', quantity: null, unit: null };
    expect(scaleIngredient(alGust, 4, 8)).toEqual(alGust);
  });
});

describe('formatQuantity / formatIngredient', () => {
  it('formata quantitat i unitat', () => {
    expect(formatQuantity(200, 'g')).toBe('200 g');
    expect(formatQuantity(null, null)).toBe('');
  });

  it('formata ingredient complet', () => {
    expect(formatIngredient({ name: 'Arròs', quantity: 200, unit: 'g' })).toBe('200 g Arròs');
    expect(formatIngredient({ name: 'Sal', quantity: null, unit: null })).toBe('Sal');
  });
});

describe('numOrNull', () => {
  it('converteix string a número', () => {
    expect(numOrNull('4')).toBe(4);
    expect(numOrNull(30)).toBe(30);
  });

  it('retorna null per a valors buits o no finits', () => {
    expect(numOrNull('')).toBeNull();
    expect(numOrNull(null)).toBeNull();
    expect(numOrNull('abc')).toBeNull();
  });
});

describe('temporades', () => {
  it('currentSeason per mesos', () => {
    expect(currentSeason(new Date('2026-03-15'))).toBe('spring');
    expect(currentSeason(new Date('2026-07-15'))).toBe('summer');
    expect(currentSeason(new Date('2026-10-15'))).toBe('autumn');
    expect(currentSeason(new Date('2026-01-15'))).toBe('winter');
  });
});

describe('totalTimeLabel', () => {
  it('formata minuts i hores', () => {
    expect(totalTimeLabel(15, 30)).toBe('45 min');
    expect(totalTimeLabel(30, 30)).toBe('1 h');
    expect(totalTimeLabel(60, 30)).toBe('1 h 30 min');
    expect(totalTimeLabel(null, null)).toBe('—');
  });
});
