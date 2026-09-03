import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApiUrl, createRecipesApi } from '~/composables/useRecipes';

describe('buildApiUrl', () => {
  it('afegeix path a base sense slash final', () => {
    expect(buildApiUrl('http://api.test:3000', '/api/recipes')).toBe(
      'http://api.test:3000/api/recipes',
    );
  });

  it('talla slash final del base', () => {
    expect(buildApiUrl('http://api.test:3000/', '/api/recipes')).toBe(
      'http://api.test:3000/api/recipes',
    );
  });

  it('afegeix query string filtrant valors buits', () => {
    expect(
      buildApiUrl('http://api.test:3000', '/api/recipes', { q: 'tomàquet', empty: '' }),
    ).toBe('http://api.test:3000/api/recipes?q=tom%C3%A0quet');
  });
});

describe('createRecipesApi', () => {
  const fetcher = vi.fn();
  const api = createRecipesApi('http://api.test:3000', fetcher as never);

  beforeEach(() => {
    fetcher.mockReset();
  });

  it('list crida GET /api/recipes sense query si no hi ha filtres', async () => {
    fetcher.mockResolvedValueOnce({ items: [], total: 0 });
    await api.list();
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes', {
      query: undefined,
    });
  });

  it('list retorna la pàgina i el total', async () => {
    const page = { items: [{ id: 'a' }], total: 42 };
    fetcher.mockResolvedValueOnce(page);
    const result = await api.list();
    expect(result).toBe(page);
    expect(result.total).toBe(42);
  });

  it('list envia tots els filtres, l’ordre i la paginació', async () => {
    fetcher.mockResolvedValueOnce({ items: [], total: 0 });
    await api.list({
      q: 'tomàquet',
      category: 'lunch',
      season: 'summer',
      difficulty: 'easy',
      time: 'lt30',
      sort: 'alpha',
      limit: 6,
      offset: 12,
    });
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes', {
      query: {
        q: 'tomàquet',
        category: 'lunch',
        season: 'summer',
        difficulty: 'easy',
        time: 'lt30',
        sort: 'alpha',
        limit: '6',
        offset: '12',
      },
    });
  });

  it('list envia offset 0 en lloc d’ometre’l', async () => {
    fetcher.mockResolvedValueOnce({ items: [], total: 0 });
    await api.list({ offset: 0 });
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes', {
      query: { offset: '0' },
    });
  });

  it('search retorna només els elements de la pàgina', async () => {
    const item = { id: 'a' };
    fetcher.mockResolvedValueOnce({ items: [item], total: 1 });
    const result = await api.search('tomàquet');
    expect(result).toEqual([item]);
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes', {
      query: { q: 'tomàquet' },
    });
  });

  it('get crida GET /api/recipes/:id', async () => {
    const fake = { id: 'abc' };
    fetcher.mockResolvedValueOnce(fake);
    const result = await api.get('abc');
    expect(result).toBe(fake);
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes/abc');
  });

  it('create envia POST', async () => {
    const payload = {
      title: 'X',
      description: null,
      notes: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      servings: null,
      category: 'lunch' as const,
      season: null,
      difficulty: null,
      ingredients: [{ name: 'Sal', quantity: null, unit: null }],
      steps: [{ title: null, instruction: 'A', durationMinutes: null }],
    };
    fetcher.mockResolvedValueOnce({});
    await api.create(payload);
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes', {
      method: 'POST',
      body: payload,
    });
  });

  it('update envia PATCH', async () => {
    const payload = {
      title: 'X',
      description: null,
      notes: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      servings: null,
      category: 'lunch' as const,
      season: null,
      difficulty: null,
      ingredients: [{ name: 'Sal', quantity: null, unit: null }],
      steps: [{ title: null, instruction: 'A', durationMinutes: null }],
    };
    fetcher.mockResolvedValueOnce({});
    await api.update('id1', payload);
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes/id1', {
      method: 'PATCH',
      body: payload,
    });
  });

  it('remove envia DELETE', async () => {
    fetcher.mockResolvedValueOnce(undefined);
    await api.remove('xyz');
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes/xyz', {
      method: 'DELETE',
    });
  });
});
