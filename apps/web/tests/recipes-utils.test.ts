import { describe, expect, it } from 'vitest';
import {
  currentSeason,
  formatIngredient,
  formatQuantity,
  numOrNull,
  parseQuantityInput,
  totalTimeLabel,
} from '~/utils/recipes';

describe('parseQuantityInput', () => {
  it('separa quantitat numèrica i unitat', () => {
    expect(parseQuantityInput('200g')).toEqual({ quantity: 200, unit: 'g' });
    expect(parseQuantityInput('1.5 L')).toEqual({ quantity: 1.5, unit: 'L' });
    expect(parseQuantityInput('2,5 kg')).toEqual({ quantity: 2.5, unit: 'kg' });
  });

  it('accepta quantitat sense unitat', () => {
    expect(parseQuantityInput('3')).toEqual({ quantity: 3, unit: null });
  });

  it('text sense número es conserva com a unitat', () => {
    expect(parseQuantityInput('Una cullerada')).toEqual({
      quantity: null,
      unit: 'Una cullerada',
    });
  });

  it('cadena buida retorna nulls', () => {
    expect(parseQuantityInput('   ')).toEqual({ quantity: null, unit: null });
  });

  it('zero o negatius es descarten com a quantitat', () => {
    expect(parseQuantityInput('0 g')).toEqual({ quantity: null, unit: 'g' });
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
