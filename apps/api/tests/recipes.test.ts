import { normalizeForSearch } from '@receptari/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { recipes } from '../src/db/schema.js';
import { buildTestApp } from './helpers/app.js';
import { createTestDb, type TestDatabase } from './helpers/db.js';

describe('Recipes API', () => {
  let app: FastifyInstance;
  let db: TestDatabase;
  let close: () => Promise<void>;

  beforeEach(async () => {
    const handle = await createTestDb();
    db = handle.db;
    close = handle.close;
    app = await buildTestApp(db);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await close();
  });

  async function searchTextOf(id: string): Promise<string> {
    const row = await db
      .select({ searchText: recipes.searchText })
      .from(recipes)
      .where(eq(recipes.id, id));
    return row[0]?.searchText ?? '';
  }

  describe('GET /api/health', () => {
    it('retorna status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 'ok' });
    });
  });

  describe('POST /api/recipes', () => {
    it('crea una recepta completa', async () => {
      const payload = {
        title: 'Pa amb tomàquet',
        description: 'Recepta clàssica catalana',
        notes: 'Servir amb oli d\'oliva verge extra',
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
        servings: 2,
        category: 'snack',
        season: 'all_year',
        difficulty: 'easy',
        ingredients: [
          { name: 'Pa de pagès', quantity: 4, unit: 'llesques' },
          { name: 'Tomàquet madur', quantity: 2, unit: 'unitats' },
          { name: 'Oli d\'oliva', quantity: null, unit: null },
        ],
        steps: [
          { instruction: 'Tallar el pa a llesques gruixudes' },
          { instruction: 'Fregar el tomàquet sobre el pa' },
          { instruction: 'Amanir amb oli i sal' },
        ],
      };

      const res = await app.inject({ method: 'POST', url: '/api/recipes', payload });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toMatchObject({
        title: payload.title,
        description: payload.description,
        notes: payload.notes,
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
        servings: 2,
        category: 'snack',
        season: 'all_year',
        difficulty: 'easy',
      });
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.ingredients).toHaveLength(3);
      expect(body.ingredients[0]).toMatchObject({ name: 'Pa de pagès', position: 0 });
      expect(body.steps).toHaveLength(3);
      expect(body.steps[0]).toMatchObject({
        instruction: 'Tallar el pa a llesques gruixudes',
        position: 0,
      });
    });

    it('rebutja una recepta sense passos', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Sense passos',
          category: 'lunch',
          ingredients: [{ name: 'Sal' }],
          steps: [],
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('ValidationError');
    });

    it('rebutja una recepta sense cap ingredient', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Sense ingredients',
          category: 'lunch',
          ingredients: [],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error).toBe('ValidationError');
      expect(JSON.stringify(body)).toContain('Cal com a mínim un ingredient');
    });

    it('rebutja payload buit', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/recipes', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('rebutja una categoria fora de l\'enum', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Categoria inventada',
          category: 'brunch',
          ingredients: [{ name: 'Sal' }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rebutja una recepta sense categoria', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Sense categoria',
          ingredients: [{ name: 'Sal' }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('accepta season i difficulty omeses i les desa com a null', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Sense temporada',
          category: 'dinner',
          ingredients: [{ name: 'Sal' }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ season: null, difficulty: null });
    });

    it('accepta una unitat de text lliure de fins a 60 caràcters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Amb romaní',
          category: 'dinner',
          ingredients: [{ name: 'Romaní', unit: 'una branqueta de romaní fresc' }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().ingredients[0].unit).toBe('una branqueta de romaní fresc');
    });

    it('accepta una unitat de 60 caràcters i en rebutja una de 61', async () => {
      const ok = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Unitat de 60',
          category: 'dinner',
          ingredients: [{ name: 'X', unit: 'a'.repeat(60) }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(ok.statusCode).toBe(201);

      const tooLong = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Unitat de 61',
          category: 'dinner',
          ingredients: [{ name: 'X', unit: 'a'.repeat(61) }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(tooLong.statusCode).toBe(400);
    });

    it('els passos conserven title i durationMinutes, i admeten null', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Passos amb títol',
          category: 'bread',
          ingredients: [{ name: 'Farina' }],
          steps: [
            { title: 'Fermentació', instruction: 'Deixar reposar', durationMinutes: 90 },
            { instruction: 'Coure' },
          ],
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.steps[0]).toMatchObject({
        title: 'Fermentació',
        instruction: 'Deixar reposar',
        durationMinutes: 90,
        position: 0,
      });
      expect(body.steps[1]).toMatchObject({
        title: null,
        durationMinutes: null,
        position: 1,
      });
    });

    it('desa un search_text normalitzat amb títol i ingredients', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Arròs amb bolets',
          category: 'lunch',
          ingredients: [{ name: 'Ceps i bolets frescos' }, { name: 'Arròs bomba' }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(201);
      expect(await searchTextOf(res.json().id)).toBe(
        'arros amb bolets ceps i bolets frescos arros bomba',
      );
    });
  });

  describe('normalizeForSearch', () => {
    it('treu accents i passa a minúscules', () => {
      expect(normalizeForSearch('Arròs')).toBe('arros');
    });
  });

  describe('GET /api/recipes', () => {
    it('retorna llista buida inicialment', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/recipes' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ items: [], total: 0 });
    });

    it('llista receptes creades amb ingredientCount', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Amanida',
          category: 'lunch',
          steps: [{ instruction: 'Mesclar' }],
          ingredients: [{ name: 'Enciam' }, { name: 'Tomàquet' }],
        },
      });
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Sopa',
          category: 'dinner',
          steps: [{ instruction: 'Bullir' }],
          ingredients: [{ name: 'Aigua' }],
        },
      });

      const res = await app.inject({ method: 'GET', url: '/api/recipes' });
      expect(res.statusCode).toBe(200);
      const { items: list, total } = res.json();
      expect(total).toBe(2);
      expect(list).toHaveLength(2);
      const amanida = list.find((r: { title: string }) => r.title === 'Amanida');
      expect(amanida.ingredientCount).toBe(2);
      expect(amanida.category).toBe('lunch');
    });

    it('filtra per text amb query q', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Crema de carbassa',
          category: 'dinner',
          ingredients: [{ name: 'Carbassa' }],
          steps: [{ instruction: 'X' }],
        },
      });
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Amanida verda',
          category: 'lunch',
          ingredients: [{ name: 'Enciam' }],
          steps: [{ instruction: 'X' }],
        },
      });

      const res = await app.inject({ method: 'GET', url: '/api/recipes?q=aman' });
      expect(res.statusCode).toBe(200);
      const { items: list, total } = res.json();
      expect(total).toBe(1);
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe('Amanida verda');
    });
  });

  describe('GET /api/recipes/:id', () => {
    it('retorna una recepta existent', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Test',
          category: 'lunch',
          ingredients: [{ name: 'Sal' }],
          steps: [{ instruction: 'Pas 1' }],
        },
      });
      const { id } = created.json();

      const res = await app.inject({ method: 'GET', url: `/api/recipes/${id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(id);
    });

    it('retorna 404 si no existeix', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/recipes/00000000-0000-0000-0000-000000000000',
      });
      expect(res.statusCode).toBe(404);
    });

    it('retorna 400 si id no és UUID', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/recipes/no-valid' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/recipes/:id', () => {
    it('actualitza una recepta existent', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Original',
          category: 'lunch',
          ingredients: [{ name: 'Ingredient antic' }],
          steps: [{ instruction: 'Pas antic' }],
        },
      });
      const { id } = created.json();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/recipes/${id}`,
        payload: {
          title: 'Renombrada',
          category: 'dessert',
          steps: [{ instruction: 'Pas nou 1' }, { instruction: 'Pas nou 2' }],
          ingredients: [{ name: 'Ingredient nou' }],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.title).toBe('Renombrada');
      expect(body.category).toBe('dessert');
      expect(body.steps).toHaveLength(2);
      expect(body.ingredients).toHaveLength(1);
    });

    it('rebutja una actualització que deixa la recepta sense ingredients', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Original',
          category: 'lunch',
          ingredients: [{ name: 'Sal' }],
          steps: [{ instruction: 'X' }],
        },
      });
      const { id } = created.json();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/recipes/${id}`,
        payload: {
          title: 'Original',
          category: 'lunch',
          ingredients: [],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.stringify(res.json())).toContain('Cal com a mínim un ingredient');
    });

    it('reescriu search_text quan es reanomena un ingredient', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Arròs',
          category: 'lunch',
          ingredients: [{ name: 'Ceba' }],
          steps: [{ instruction: 'X' }],
        },
      });
      const { id } = created.json();
      expect(await searchTextOf(id)).toBe('arros ceba');

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/recipes/${id}`,
        payload: {
          title: 'Arròs',
          category: 'lunch',
          ingredients: [{ name: 'Ceps i bolets frescos' }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(200);
      expect(await searchTextOf(id)).toBe('arros ceps i bolets frescos');
    });

    it('retorna 404 si la recepta no existeix', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/recipes/00000000-0000-0000-0000-000000000000',
        payload: {
          title: 'X',
          category: 'lunch',
          ingredients: [{ name: 'Sal' }],
          steps: [{ instruction: 'X' }],
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/recipes/:id/favorite', () => {
    it('ja no existeix: retorna 404', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Sense favorits',
          category: 'lunch',
          ingredients: [{ name: 'Sal' }],
          steps: [{ instruction: 'X' }],
        },
      });
      const { id } = created.json();

      const res = await app.inject({
        method: 'POST',
        url: `/api/recipes/${id}/favorite`,
        payload: {},
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/recipes/:id', () => {
    it('esborra una recepta i cascadeja ingredients i steps', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'A esborrar',
          category: 'lunch',
          ingredients: [{ name: 'X' }],
          steps: [{ instruction: 'X' }],
        },
      });
      const { id } = created.json();

      const del = await app.inject({ method: 'DELETE', url: `/api/recipes/${id}` });
      expect(del.statusCode).toBe(204);

      const get = await app.inject({ method: 'GET', url: `/api/recipes/${id}` });
      expect(get.statusCode).toBe(404);

      const list = await app.inject({ method: 'GET', url: '/api/recipes' });
      expect(list.json()).toEqual({ items: [], total: 0 });
    });

    it('retorna 404 si la recepta no existeix', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/recipes/00000000-0000-0000-0000-000000000000',
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
