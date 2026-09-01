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

  it('list crida GET /api/recipes sense query si q és buit', async () => {
    fetcher.mockResolvedValueOnce([]);
    await api.list();
    expect(fetcher).toHaveBeenCalledWith('http://api.test:3000/api/recipes', {
      query: undefined,
    });
  });

  it('list envia query si q és present', async () => {
    fetcher.mockResolvedValueOnce([]);
    await api.list({ q: 'tomàquet' });
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
      ingredients: [],
      steps: [{ instruction: 'A' }],
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
      ingredients: [],
      steps: [{ instruction: 'A' }],
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
