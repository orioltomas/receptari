import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers/app.js';
import { createTestDb, type TestDatabase } from './helpers/db.js';

type RecipePayload = {
  title: string;
  category: string;
  season?: string | null;
  difficulty?: string | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  ingredients?: Array<{ name: string }>;
};

describe('GET /api/recipes — filtres, ordenació, paginació i cerca', () => {
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

  async function create(payload: RecipePayload): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        season: null,
        difficulty: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: [{ name: 'Sal' }],
        steps: [{ instruction: 'Pas únic' }],
        ...payload,
      },
    });
    expect(res.statusCode).toBe(201);
    return res.json().id as string;
  }

  async function list(query = ''): Promise<{
    items: Array<{ title: string; ingredientCount: number; prepTimeMinutes: number | null }>;
    total: number;
  }> {
    const res = await app.inject({ method: 'GET', url: `/api/recipes${query}` });
    expect(res.statusCode).toBe(200);
    return res.json();
  }

  const titles = (r: { items: Array<{ title: string }> }): string[] =>
    r.items.map((item) => item.title);

  async function seedSearchFixtures(): Promise<void> {
    await create({
      title: 'Arròs negre',
      category: 'lunch',
      ingredients: [{ name: 'Arròs bomba' }, { name: 'Sípia' }],
    });
    await create({
      title: 'Fricandó',
      category: 'lunch',
      ingredients: [{ name: 'Vedella' }, { name: 'Ceps i bolets frescos' }],
    });
    await create({
      title: 'Arròs amb bolets',
      category: 'dinner',
      ingredients: [{ name: 'Arròs' }, { name: 'Rovellons' }],
    });
  }

  describe('resposta paginada', () => {
    it('retorna { items, total } i no un array', async () => {
      const empty = await list();
      expect(empty).toEqual({ items: [], total: 0 });
    });

    it('aplica limit i offset sobre receptes, amb el total sense paginar', async () => {
      for (let i = 0; i < 8; i += 1) {
        await create({
          title: `Recepta ${String(i).padStart(2, '0')}`,
          category: 'lunch',
          // Two ingredients: total must not count join rows.
          ingredients: [{ name: 'Aigua' }, { name: 'Sal' }],
        });
      }

      const first = await list('?limit=6&offset=0&sort=alpha');
      expect(first.items).toHaveLength(6);
      expect(first.total).toBe(8);
      expect(first.items[0]?.ingredientCount).toBe(2);

      const second = await list('?limit=6&offset=6&sort=alpha');
      expect(second.items).toHaveLength(2);
      expect(second.total).toBe(8);
      expect(titles(second)).toEqual(['Recepta 06', 'Recepta 07']);
    });

    it('per defecte retorna com a molt 6 elements', async () => {
      for (let i = 0; i < 7; i += 1) {
        await create({ title: `R${i}`, category: 'lunch' });
      }
      const res = await list();
      expect(res.items).toHaveLength(6);
      expect(res.total).toBe(7);
    });
  });

  describe('cerca per títol i per nom d\'ingredient', () => {
    it('és insensible als accents', async () => {
      await seedSearchFixtures();
      const res = await list('?q=arros&sort=alpha');
      expect(titles(res)).toEqual(['Arròs amb bolets', 'Arròs negre']);
      expect(res.total).toBe(2);
    });

    it('cerca també pel nom dels ingredients', async () => {
      await seedSearchFixtures();
      const res = await list('?q=bolets&sort=alpha');
      // "Fricandó" lacks the word in its title but has it in an ingredient.
      expect(titles(res)).toEqual(['Arròs amb bolets', 'Fricandó']);
    });

    it('una cerca de diverses paraules exigeix totes les paraules', async () => {
      await seedSearchFixtures();
      const res = await list('?q=arros%20bolets');
      expect(titles(res)).toEqual(['Arròs amb bolets']);
      expect(res.total).toBe(1);
    });

    it('les paraules poden coincidir en camps diferents', async () => {
      await seedSearchFixtures();
      const res = await list('?q=fricando%20ceps');
      expect(titles(res)).toEqual(['Fricandó']);
    });

    it('no cerca dins la descripció ni les notes', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/recipes',
        payload: {
          title: 'Truita',
          category: 'dinner',
          description: 'Boníssima amb carxofes',
          notes: 'Provar amb carxofes',
          ingredients: [{ name: 'Ou' }],
          steps: [{ instruction: 'Batre' }],
        },
      });
      const res = await list('?q=carxofes');
      expect(res.items).toHaveLength(0);
    });
  });

  describe('ordenació', () => {
    it('sort=alpha ordena pel títol ascendent', async () => {
      await create({ title: 'Sopa', category: 'dinner' });
      await create({ title: 'Amanida', category: 'lunch' });
      await create({ title: 'Mandonguilles', category: 'lunch' });

      expect(titles(await list('?sort=alpha'))).toEqual(['Amanida', 'Mandonguilles', 'Sopa']);
    });

    it('sort=prep ordena pel temps de preparació amb els nuls al final', async () => {
      await create({ title: 'Sense temps', category: 'lunch', prepTimeMinutes: null });
      await create({ title: 'Lenta', category: 'lunch', prepTimeMinutes: 90 });
      await create({ title: 'Ràpida', category: 'lunch', prepTimeMinutes: 5 });

      expect(titles(await list('?sort=prep'))).toEqual(['Ràpida', 'Lenta', 'Sense temps']);
    });

    it('sort=recent és el valor per defecte', async () => {
      await create({ title: 'Primera', category: 'lunch' });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await create({ title: 'Segona', category: 'lunch' });

      expect(titles(await list())).toEqual(titles(await list('?sort=recent')));
      expect(titles(await list())[0]).toBe('Segona');
    });
  });

  describe('filtres', () => {
    async function seedFilterFixtures(): Promise<void> {
      await create({
        title: 'Coca de recapte',
        category: 'bread',
        season: 'summer',
        difficulty: 'hard',
        prepTimeMinutes: 40,
        cookTimeMinutes: 45,
      });
      await create({
        title: 'Escudella',
        category: 'lunch',
        season: 'winter',
        difficulty: 'medium',
        prepTimeMinutes: 30,
        cookTimeMinutes: 20,
      });
      await create({
        title: 'Pa amb tomàquet',
        category: 'snack',
        season: 'all_year',
        difficulty: 'easy',
        prepTimeMinutes: 5,
        cookTimeMinutes: null,
      });
      await create({
        title: 'Sense temps',
        category: 'lunch',
        season: 'winter',
        difficulty: 'easy',
        prepTimeMinutes: null,
        cookTimeMinutes: null,
      });
    }

    it('filtra per category', async () => {
      await seedFilterFixtures();
      const res = await list('?category=lunch&sort=alpha');
      expect(titles(res)).toEqual(['Escudella', 'Sense temps']);
      expect(res.total).toBe(2);
    });

    it('filtra per season', async () => {
      await seedFilterFixtures();
      expect(titles(await list('?season=winter&sort=alpha'))).toEqual(['Escudella', 'Sense temps']);
    });

    it('filtra per difficulty', async () => {
      await seedFilterFixtures();
      expect(titles(await list('?difficulty=hard'))).toEqual(['Coca de recapte']);
    });

    it('filtra per trams de temps sobre prep + cook', async () => {
      await seedFilterFixtures();
      expect(titles(await list('?time=lt30'))).toEqual(['Pa amb tomàquet']);
      expect(titles(await list('?time=30to60'))).toEqual(['Escudella']);
      expect(titles(await list('?time=gt60'))).toEqual(['Coca de recapte']);
    });

    it('exclou de tots els trams una recepta amb els dos temps nuls', async () => {
      await seedFilterFixtures();
      for (const bucket of ['lt30', '30to60', 'gt60']) {
        const res = await list(`?time=${bucket}`);
        expect(titles(res)).not.toContain('Sense temps');
      }
    });

    it('combina els filtres amb la cerca', async () => {
      await seedSearchFixtures();
      await create({
        title: 'Arròs de festa',
        category: 'dessert',
        ingredients: [{ name: 'Arròs' }],
      });

      const res = await list('?q=arros&category=dinner');
      expect(titles(res)).toEqual(['Arròs amb bolets']);
      expect(res.total).toBe(1);
    });
  });

  describe('validació de la query', () => {
    it('rebutja limit fora de rang', async () => {
      for (const limit of [0, 51]) {
        const res = await app.inject({ method: 'GET', url: `/api/recipes?limit=${limit}` });
        expect(res.statusCode).toBe(400);
      }
    });

    it('rebutja un offset negatiu', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/recipes?offset=-1' });
      expect(res.statusCode).toBe(400);
    });

    it('rebutja un sort desconegut', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/recipes?sort=magic' });
      expect(res.statusCode).toBe(400);
    });

    it('rebutja valors fora dels enums de classificació', async () => {
      for (const query of ['category=brunch', 'season=monsoon', 'difficulty=impossible']) {
        const res = await app.inject({ method: 'GET', url: `/api/recipes?${query}` });
        expect(res.statusCode).toBe(400);
      }
    });

    it('ignora un paràmetre favorite: els preferits ja no existeixen', async () => {
      await create({ title: 'Qualsevol', category: 'lunch' });
      // `favorite` does not exist: it is ignored and filters nothing.
      const res = await list('?favorite=true');
      expect(res.total).toBe(1);
    });
  });
});
