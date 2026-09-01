import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
      });
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.ingredients).toHaveLength(3);
      expect(body.ingredients[0]).toMatchObject({ name: 'Pa de pagès', position: 0 });
      expect(body.steps).toHaveLength(3);
      expect(body.steps[0]).toMatchObject({ instruction: 'Tallar el pa a llesques gruixudes', position: 0 });
    });

    it('rebutja una recepta sense passos', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Sense passos',
          steps: [],
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('ValidationError');
    });

    it('rebutja payload buit', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/recipes', payload: {} });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/recipes', () => {
    it('retorna llista buida inicialment', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/recipes' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it('llista receptes creades amb ingredientCount', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Amanida',
          steps: [{ instruction: 'Mesclar' }],
          ingredients: [{ name: 'Enciam' }, { name: 'Tomàquet' }],
        },
      });
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Sopa',
          steps: [{ instruction: 'Bullir' }],
        },
      });

      const res = await app.inject({ method: 'GET', url: '/api/recipes' });
      expect(res.statusCode).toBe(200);
      const list = res.json();
      expect(list).toHaveLength(2);
      const amanida = list.find((r: { title: string }) => r.title === 'Amanida');
      expect(amanida.ingredientCount).toBe(2);
    });

    it('filtra per text amb query q', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: { title: 'Crema de carbassa', steps: [{ instruction: 'X' }] },
      });
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: { title: 'Amanida verda', steps: [{ instruction: 'X' }] },
      });

      const res = await app.inject({ method: 'GET', url: '/api/recipes?q=aman' });
      expect(res.statusCode).toBe(200);
      const list = res.json();
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
          steps: [{ instruction: 'Pas antic' }],
        },
      });
      const { id } = created.json();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/recipes/${id}`,
        payload: {
          title: 'Renombrada',
          steps: [{ instruction: 'Pas nou 1' }, { instruction: 'Pas nou 2' }],
          ingredients: [{ name: 'Ingredient nou' }],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.title).toBe('Renombrada');
      expect(body.steps).toHaveLength(2);
      expect(body.ingredients).toHaveLength(1);
    });

    it('retorna 404 si la recepta no existeix', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/recipes/00000000-0000-0000-0000-000000000000',
        payload: { title: 'X', steps: [{ instruction: 'X' }] },
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
      expect(list.json()).toEqual([]);
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
