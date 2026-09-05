import type { Recipe } from '@receptari/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_TEXT_LENGTH,
  UNIT_SUGGESTIONS,
  clearDraft,
  draftKeyFor,
  emptyFormState,
  formStateFromRecipe,
  isFormStateEmpty,
  moveItem,
  readDraft,
  resolveIngredientRow,
  resolveStepRow,
  validateForm,
  writeDraft,
  type RecipeFormState,
  type StorageLike,
} from '~/utils/recipe-form';
import { MAX_UNIT_LENGTH } from '~/utils/recipes';

function stateWith(overrides: Partial<RecipeFormState> = {}): RecipeFormState {
  return {
    ...emptyFormState(),
    title: 'Risotto de bolets',
    category: 'lunch',
    ingredients: [{ quantityText: '200', unitText: 'g', name: 'Arròs Arborio' }],
    steps: [{ title: '', instruction: 'Sofregir la ceba.', durationText: '' }],
    ...overrides,
  };
}

const fullRecipe: Recipe = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Escudella',
  description: 'Un brou d’hivern.',
  notes: 'Maridatge: un negre jove.',
  prepTimeMinutes: 20,
  cookTimeMinutes: 90,
  servings: 6,
  category: 'lunch',
  season: 'winter',
  difficulty: 'medium',
  ingredients: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Cigrons',
      quantity: 300,
      unit: 'g',
      position: 0,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Sal',
      quantity: null,
      unit: 'al gust',
      position: 1,
    },
  ],
  steps: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Remull',
      instruction: 'Deixa els cigrons en remull.',
      durationMinutes: 720,
      position: 0,
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      title: null,
      instruction: 'Cou-ho tot plegat.',
      durationMinutes: null,
      position: 1,
    },
  ],
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:00:00.000Z',
};

describe('files d’ingredient', () => {
  it('separa quantitat i unitat', () => {
    expect(resolveIngredientRow({ quantityText: '200', unitText: 'g', name: 'Arròs' })).toEqual({
      status: 'ok',
      name: 'Arròs',
      quantity: 200,
      unit: 'g',
    });
  });

  it('accepta un ingredient sense quantitat', () => {
    expect(resolveIngredientRow({ quantityText: '', unitText: '', name: 'Sal' })).toEqual({
      status: 'ok',
      name: 'Sal',
      quantity: null,
      unit: null,
    });
  });

  it('agafa la unitat escrita dins la quantitat quan el camp d’unitat és buit', () => {
    expect(
      resolveIngredientRow({ quantityText: 'un pessic', unitText: '', name: 'Sal' }),
    ).toEqual({ status: 'ok', name: 'Sal', quantity: null, unit: 'un pessic' });
  });

  it('avisa quan la quantitat no és més gran que zero, i no la converteix en null', () => {
    const result = resolveIngredientRow({ quantityText: '0', unitText: '', name: 'Sal' });
    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') throw new Error('esperava invalid');
    expect(result.problem).toBe('quantity-not-positive');
    expect(result.message).toMatch(/més gran que zero/);
    expect(result).not.toHaveProperty('quantity');
  });

  it('avisa amb una quantitat negativa', () => {
    expect(resolveIngredientRow({ quantityText: '-3', unitText: 'g', name: 'Sal' }).status).toBe(
      'invalid',
    );
  });

  it(`accepta una unitat de ${MAX_UNIT_LENGTH} caràcters i rebutja la de ${MAX_UNIT_LENGTH + 1}`, () => {
    const ok = 'u'.repeat(MAX_UNIT_LENGTH);
    const tooLong = 'u'.repeat(MAX_UNIT_LENGTH + 1);
    expect(resolveIngredientRow({ quantityText: '2', unitText: ok, name: 'Sal' }).status).toBe('ok');
    const bad = resolveIngredientRow({ quantityText: '2', unitText: tooLong, name: 'Sal' });
    expect(bad.status).toBe('invalid');
    if (bad.status !== 'invalid') throw new Error('esperava invalid');
    expect(bad.problem).toBe('unit-too-long');
  });

  it('accepta unitats de fora de la llista de suggeriments', () => {
    const unit = 'una branqueta de romaní fresc';
    expect(UNIT_SUGGESTIONS).not.toContain(unit);
    expect(resolveIngredientRow({ quantityText: '1', unitText: unit, name: 'Romaní' })).toEqual({
      status: 'ok',
      name: 'Romaní',
      quantity: 1,
      unit,
    });
  });

  it('avisa quan la unitat es contradiu entre els dos camps', () => {
    const result = resolveIngredientRow({ quantityText: '200 g', unitText: 'ml', name: 'Llet' });
    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') throw new Error('esperava invalid');
    expect(result.problem).toBe('unit-conflict');
  });

  it('no descarta una quantitat escrita sense nom d’ingredient', () => {
    const result = resolveIngredientRow({ quantityText: '200', unitText: 'g', name: '' });
    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') throw new Error('esperava invalid');
    expect(result.problem).toBe('name-missing');
  });

  it('descarta en silenci només la fila del tot buida', () => {
    expect(resolveIngredientRow({ quantityText: '', unitText: '', name: '' })).toEqual({
      status: 'empty',
    });
  });
});

describe('files de pas', () => {
  it('conserva títol i durada opcionals', () => {
    expect(
      resolveStepRow({ title: 'Remull', instruction: 'Deixa-ho estar.', durationText: '30' }),
    ).toEqual({
      status: 'ok',
      title: 'Remull',
      instruction: 'Deixa-ho estar.',
      durationMinutes: 30,
    });
  });

  it('avisa d’un pas amb títol però sense instrucció', () => {
    expect(resolveStepRow({ title: 'Remull', instruction: '', durationText: '' }).status).toBe(
      'invalid',
    );
  });

  it('descarta la fila del tot buida', () => {
    expect(resolveStepRow({ title: '', instruction: '', durationText: '' }).status).toBe('empty');
  });
});

describe('validació del formulari', () => {
  it('construeix la càrrega completa', () => {
    const result = validateForm(
      stateWith({
        description: 'Cremós',
        notes: 'Maridatge: blanc',
        prepTimeText: '10',
        cookTimeText: '25',
        servingsText: '4',
        season: 'autumn',
        difficulty: 'easy',
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('esperava ok');
    expect(result.payload).toEqual({
      title: 'Risotto de bolets',
      description: 'Cremós',
      notes: 'Maridatge: blanc',
      prepTimeMinutes: 10,
      cookTimeMinutes: 25,
      servings: 4,
      category: 'lunch',
      season: 'autumn',
      difficulty: 'easy',
      ingredients: [{ name: 'Arròs Arborio', quantity: 200, unit: 'g' }],
      steps: [{ title: null, instruction: 'Sofregir la ceba.', durationMinutes: null }],
    });
  });

  it('no envia cap position: l’ordre de l’array és l’ordre', () => {
    const result = validateForm(stateWith());
    if (!result.ok) throw new Error('esperava ok');
    expect(result.payload.ingredients[0]).not.toHaveProperty('position');
    expect(result.payload.steps[0]).not.toHaveProperty('position');
  });

  it('exigeix el títol', () => {
    const result = validateForm(stateWith({ title: '   ' }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('esperava error');
    expect(result.errors.title).toBeTruthy();
  });

  it('exigeix la categoria', () => {
    const result = validateForm(stateWith({ category: '' }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('esperava error');
    expect(result.errors.category).toBeTruthy();
  });

  it('deixa temporada i dificultat buides', () => {
    const result = validateForm(stateWith({ season: null, difficulty: null }));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('esperava ok');
    expect(result.payload.season).toBeNull();
    expect(result.payload.difficulty).toBeNull();
  });

  it('bloqueja un desat sense cap ingredient', () => {
    const result = validateForm(
      stateWith({ ingredients: [{ quantityText: '', unitText: '', name: '' }] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('esperava error');
    expect(result.errors.ingredients).toBe('Cal com a mínim un ingredient.');
  });

  it('bloqueja un desat sense cap pas', () => {
    const result = validateForm(
      stateWith({ steps: [{ title: '', instruction: '', durationText: '' }] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('esperava error');
    expect(result.errors.steps).toBe('Cal com a mínim un pas.');
  });

  it(`caça una nota de ${MAX_TEXT_LENGTH + 1} caràcters abans d’enviar-la`, () => {
    const result = validateForm(stateWith({ notes: 'n'.repeat(MAX_TEXT_LENGTH + 1) }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('esperava error');
    expect(result.errors.notes).toBeTruthy();
  });

  it(`accepta una nota de ${MAX_TEXT_LENGTH} caràcters`, () => {
    expect(validateForm(stateWith({ notes: 'n'.repeat(MAX_TEXT_LENGTH) })).ok).toBe(true);
  });

  it(`caça una descripció de ${MAX_TEXT_LENGTH + 1} caràcters`, () => {
    const result = validateForm(stateWith({ description: 'd'.repeat(MAX_TEXT_LENGTH + 1) }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('esperava error');
    expect(result.errors.description).toBeTruthy();
  });

  it('marca la fila concreta que falla', () => {
    const result = validateForm(
      stateWith({
        ingredients: [
          { quantityText: '200', unitText: 'g', name: 'Arròs' },
          { quantityText: '0', unitText: '', name: 'Sal' },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('esperava error');
    expect(result.errors.ingredientRows[0]).toBeUndefined();
    expect(result.errors.ingredientRows[1]).toMatch(/més gran que zero/);
  });
});

describe('hidratació des d’una recepta', () => {
  it('recupera tots els camps, inclosos títol i durada del pas', () => {
    const state = formStateFromRecipe(fullRecipe);
    expect(state.title).toBe('Escudella');
    expect(state.category).toBe('lunch');
    expect(state.season).toBe('winter');
    expect(state.difficulty).toBe('medium');
    expect(state.servingsText).toBe('6');
    expect(state.ingredients).toEqual([
      { quantityText: '300', unitText: 'g', name: 'Cigrons' },
      { quantityText: '', unitText: 'al gust', name: 'Sal' },
    ]);
    expect(state.steps[0]).toEqual({
      title: 'Remull',
      instruction: 'Deixa els cigrons en remull.',
      durationText: '720',
    });
  });

  it('desa-la de nou sense perdre cap camp', () => {
    const result = validateForm(formStateFromRecipe(fullRecipe));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('esperava ok');
    expect(result.payload).toEqual({
      title: fullRecipe.title,
      description: fullRecipe.description,
      notes: fullRecipe.notes,
      prepTimeMinutes: 20,
      cookTimeMinutes: 90,
      servings: 6,
      category: 'lunch',
      season: 'winter',
      difficulty: 'medium',
      ingredients: [
        { name: 'Cigrons', quantity: 300, unit: 'g' },
        { name: 'Sal', quantity: null, unit: 'al gust' },
      ],
      steps: [
        { title: 'Remull', instruction: 'Deixa els cigrons en remull.', durationMinutes: 720 },
        { title: null, instruction: 'Cou-ho tot plegat.', durationMinutes: null },
      ],
    });
  });
});

describe('reordenació', () => {
  it('l’ordre desat segueix l’ordre de la pantalla', () => {
    const state = formStateFromRecipe(fullRecipe);
    expect(moveItem(state.steps, 1, -1)).toBe(true);
    const result = validateForm(state);
    if (!result.ok) throw new Error('esperava ok');
    expect(result.payload.steps.map((s) => s.instruction)).toEqual([
      'Cou-ho tot plegat.',
      'Deixa els cigrons en remull.',
    ]);
  });

  it('no mou res fora de rang', () => {
    const items = ['a', 'b'];
    expect(moveItem(items, 0, -1)).toBe(false);
    expect(moveItem(items, 1, 1)).toBe(false);
    expect(items).toEqual(['a', 'b']);
  });
});

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string {
    throw new Error('storage blocked');
  }
  setItem(): void {
    throw new Error('storage blocked');
  }
  removeItem(): void {
    throw new Error('storage blocked');
  }
}

describe('esborrany', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('l’esborrany de nova recepta i el d’edició no es trepitgen', () => {
    const addKey = draftKeyFor(null);
    const editKey = draftKeyFor(fullRecipe.id);
    expect(addKey).not.toBe(editKey);

    writeDraft(addKey, stateWith({ title: 'Nova' }), storage);
    writeDraft(editKey, stateWith({ title: 'Editada' }), storage);

    expect(readDraft(addKey, storage)?.title).toBe('Nova');
    expect(readDraft(editKey, storage)?.title).toBe('Editada');
  });

  it('dues receptes diferents tenen claus diferents', () => {
    expect(draftKeyFor('a')).not.toBe(draftKeyFor('b'));
  });

  it('recupera l’esborrany sencer', () => {
    const state = stateWith({ notes: 'a mig escriure' });
    writeDraft(draftKeyFor(null), state, storage);
    expect(readDraft(draftKeyFor(null), storage)).toEqual(state);
  });

  it('esborra l’esborrany', () => {
    writeDraft(draftKeyFor(null), stateWith(), storage);
    clearDraft(draftKeyFor(null), storage);
    expect(readDraft(draftKeyFor(null), storage)).toBeNull();
  });

  it('un magatzem que peta no trenca res', () => {
    const broken = new ThrowingStorage();
    expect(() => writeDraft('k', stateWith(), broken)).not.toThrow();
    expect(() => clearDraft('k', broken)).not.toThrow();
    expect(readDraft('k', broken)).toBeNull();
  });

  it('sense magatzem tampoc peta', () => {
    expect(() => writeDraft('k', stateWith(), null)).not.toThrow();
    expect(() => clearDraft('k', null)).not.toThrow();
    expect(readDraft('k', null)).toBeNull();
  });

  it('ignora un esborrany corrupte o d’una forma desconeguda', () => {
    storage.setItem('k', 'no és json');
    expect(readDraft('k', storage)).toBeNull();
    storage.setItem('k', JSON.stringify({ quelcom: 'altre' }));
    expect(readDraft('k', storage)).toBeNull();
  });

  it('un formulari verge no compta com a esborrany', () => {
    expect(isFormStateEmpty(emptyFormState())).toBe(true);
    expect(isFormStateEmpty(stateWith())).toBe(false);
  });
});
