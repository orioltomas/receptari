import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { normalizeForSearch } from '@receptari/shared';
import {
  CREATE_EXTENSIONS_SQL,
  PGLITE_EXTENSIONS,
  PGLITE_PREFIX,
  type Database,
  isPgliteUrl,
  schema,
} from './client.js';

const { ingredients, recipes, steps } = schema;

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, '..', '..', '.env') });

/** Classification keys. Stored as keys, never as Catalan labels. */
type Category = 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'snack' | 'bread';
type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all_year';
type Difficulty = 'easy' | 'medium' | 'hard';

interface SeedIngredient {
  name: string;
  /** Free-form; may be absent entirely. When present it is > 0. */
  quantity?: number;
  /** Free text, at most 60 characters. */
  unit?: string;
}

interface SeedStep {
  instruction: string;
  title?: string;
  durationMinutes?: number;
}

interface SeedRecipe {
  title: string;
  description: string | null;
  notes: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  category: Category;
  season: Season | null;
  difficulty: Difficulty | null;
  /** At least one of each. */
  ingredients: SeedIngredient[];
  steps: SeedStep[];
}

/**
 * The dataset is deliberately small but exercises every edge case a developer
 * needs to see right after a fresh migrate: all six categories, a null season,
 * a null difficulty, an ingredient with neither quantity nor unit, an accented
 * title, a recipe found only through an ingredient name, all three time buckets
 * plus one recipe with no times at all, and steps with and without the optional
 * title and duration.
 *
 * No tags, no image and no favourite flag exist here.
 */
const SEED_RECIPES: SeedRecipe[] = [
  {
    title: 'Torrades amb tomàquet i oli',
    description: "L'esmorzar de sempre: pa torrat, tomàquet madur i un bon raig d'oli.",
    notes: 'Millor amb pa de pagès del dia abans; el pa massa fresc es desfà.',
    prepTimeMinutes: 10,
    cookTimeMinutes: 5,
    servings: 2,
    category: 'breakfast',
    season: 'all_year',
    difficulty: 'easy',
    ingredients: [
      { name: 'Pa de pagès', quantity: 4, unit: 'llesques' },
      { name: 'Tomàquets de penjar', quantity: 2, unit: 'unitats' },
      { name: "Oli d'oliva verge extra", quantity: 2, unit: 'cullerades' },
      { name: 'Sal i pebre' },
    ],
    steps: [
      {
        title: 'Torrar el pa',
        instruction:
          'Torra les llesques a la graella fins que quedin daurades per les dues bandes.',
        durationMinutes: 5,
      },
      { instruction: 'Frega el tomàquet per la cara calenta del pa fins que quedi ben vermella.' },
      {
        title: 'Amanir',
        instruction: "Amaneix amb un raig d'oli i una mica de sal.",
        durationMinutes: 1,
      },
    ],
  },
  {
    title: 'Arròs de la tieta Neus',
    description: 'Arròs de muntanya amb bolets, tal com el feia la tieta els diumenges de tardor.',
    notes: 'Deixa reposar cinc minuts abans de servir.',
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    servings: 4,
    category: 'lunch',
    season: 'autumn',
    difficulty: 'medium',
    ingredients: [
      { name: 'Arròs bomba', quantity: 320, unit: 'g' },
      { name: 'Ceps i bolets frescos', quantity: 300, unit: 'g' },
      { name: 'Ceba de Figueres', quantity: 1, unit: 'unitat' },
      { name: 'Brou de pollastre', quantity: 1, unit: 'l' },
      { name: 'Romaní', quantity: 1, unit: 'una branqueta de romaní fresc' },
      { name: 'Sal i pebre' },
    ],
    steps: [
      {
        title: 'Sofregit',
        instruction: 'Sofregeix la ceba ben picada a foc lent fins que es desfaci.',
        durationMinutes: 12,
      },
      {
        title: 'Els bolets',
        instruction: "Afegeix els bolets nets i tallats i deixa que perdin tota l'aigua.",
        durationMinutes: 8,
      },
      { instruction: "Incorpora l'arròs i remena un minut perquè s'impregni del sofregit." },
      {
        title: 'Coure',
        instruction: 'Aboca el brou calent, rectifica de sal i cou a foc mitjà sense remenar.',
        durationMinutes: 18,
      },
    ],
  },
  {
    title: "Escudella barrejada d'hivern",
    description: 'El plat de cullera de les festes, cuit a foc lent tot el matí.',
    notes: 'La pilota es pot fer el dia abans i guardar-la a la nevera.',
    prepTimeMinutes: 40,
    cookTimeMinutes: 150,
    servings: 6,
    category: 'dinner',
    season: 'winter',
    difficulty: 'hard',
    ingredients: [
      { name: 'Cigrons remullats', quantity: 400, unit: 'g' },
      { name: 'Galets', quantity: 200, unit: 'g' },
      { name: 'Carn magra de vedella', quantity: 300, unit: 'g' },
      { name: 'Os de pernil', quantity: 1, unit: 'unitat' },
      { name: "Col d'hivern", quantity: 0.5, unit: 'unitat' },
      { name: 'Patates', quantity: 3, unit: 'unitats' },
    ],
    steps: [
      {
        title: 'Arrencar el brou',
        instruction: "Posa la carn, l'os i els cigrons en aigua freda i porta-ho a ebullició.",
        durationMinutes: 30,
      },
      { instruction: 'Escuma el brou tantes vegades com calgui perquè quedi net.' },
      {
        title: 'Verdures',
        instruction: 'Afegeix la col i les patates i cou-ho tot a foc molt lent.',
        durationMinutes: 90,
      },
      {
        title: 'Els galets',
        instruction: "Cola el brou, torna'l al foc i cou-hi els galets fins que siguin al punt.",
        durationMinutes: 15,
      },
    ],
  },
  {
    title: 'Crema catalana de Sant Josep',
    description: 'Crema fina de llimona i canyella amb la capa de sucre cremat.',
    notes: "Crema el sucre just abans de servir perquè no s'estovi.",
    prepTimeMinutes: 30,
    cookTimeMinutes: 20,
    servings: 6,
    category: 'dessert',
    season: 'all_year',
    difficulty: 'medium',
    ingredients: [
      { name: 'Llet sencera', quantity: 1, unit: 'l' },
      { name: "Rovells d'ou", quantity: 8, unit: 'unitats' },
      { name: 'Sucre', quantity: 200, unit: 'g' },
      { name: 'Midó de blat de moro', quantity: 40, unit: 'g' },
      { name: 'Pela de llimona', quantity: 1, unit: 'unitat' },
      { name: 'Canyella en branca', quantity: 1, unit: 'unitat' },
    ],
    steps: [
      {
        title: 'Infusionar la llet',
        instruction:
          'Escalfa la llet amb la pela de llimona i la canyella i deixa-la reposar tapada.',
        durationMinutes: 15,
      },
      { instruction: 'Bat els rovells amb el sucre i el midó fins a obtenir una pasta llisa.' },
      {
        title: 'Lligar la crema',
        instruction:
          'Aboca la llet colada sobre els rovells i cou-ho a foc lent sense parar de remenar.',
        durationMinutes: 10,
      },
      {
        instruction:
          'Reparteix la crema en cassoletes i deixa-la refredar un mínim de quatre hores.',
      },
    ],
  },
  {
    title: 'Pa de pagès amb massa mare',
    description: 'Pa de crosta gruixuda i molla alveolada, amb fermentació llarga.',
    notes: "La massa mare ha d'estar activa: ha de doblar en quatre hores.",
    prepTimeMinutes: 30,
    cookTimeMinutes: 45,
    servings: 1,
    category: 'bread',
    // No season: bread is made all year round, and leaving it null shows the
    // "unknown season" slot in the UI.
    season: null,
    difficulty: 'hard',
    ingredients: [
      { name: 'Farina de força', quantity: 500, unit: 'g' },
      { name: 'Aigua', quantity: 350, unit: 'ml' },
      { name: 'Massa mare activa', quantity: 100, unit: 'g' },
      { name: 'Sal marina', quantity: 10, unit: 'g' },
    ],
    steps: [
      {
        title: 'Autòlisi',
        instruction: "Barreja la farina amb l'aigua i deixa-ho reposar tapat.",
        durationMinutes: 45,
      },
      {
        instruction:
          'Incorpora la massa mare i la sal i fes plecs cada mitja hora durant tres hores.',
      },
      {
        title: 'Fermentació en fred',
        instruction: "Forma el pa, posa'l al cistell i deixa'l a la nevera tota la nit.",
        durationMinutes: 720,
      },
      {
        title: 'Cocció',
        instruction:
          "Cou-lo dins una cassola tapada a 250 °C i acaba'l destapat fins que sigui ben daurat.",
        durationMinutes: 45,
      },
    ],
  },
  {
    title: 'Olives adobades amb fonoll',
    description: 'Pica-pica ràpid per acompanyar el vermut.',
    notes: null,
    prepTimeMinutes: 15,
    // No cooking at all: the time bucket only counts the preparation.
    cookTimeMinutes: null,
    servings: 4,
    category: 'snack',
    season: 'summer',
    // No difficulty: not every recipe is worth classifying by effort.
    difficulty: null,
    ingredients: [
      { name: 'Olives arbequines', quantity: 400, unit: 'g' },
      { name: 'Fonoll sec', quantity: 1, unit: 'cullerada' },
      { name: 'All', quantity: 2, unit: 'grans' },
      { name: 'Pela de taronja', quantity: 1, unit: 'tira' },
    ],
    steps: [
      { instruction: 'Esclafa lleugerament les olives amb el pla del ganivet.' },
      {
        title: 'Adobar',
        instruction:
          'Barreja-ho tot en un pot de vidre amb aigua i sal i deixa-ho macerar tres dies.',
        durationMinutes: 10,
      },
    ],
  },
  {
    title: 'Escalivada de la iaia',
    description: 'Verdures escalivades a la brasa, pelades en calent i amanides amb oli i sal.',
    notes: 'La iaia mai no cronometrava res: es treu del foc quan la pell està ben negra.',
    // Both times unknown on purpose: an unfilled time is unknown, not zero, so
    // this recipe falls outside every time bucket.
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    servings: 4,
    category: 'dinner',
    season: 'summer',
    difficulty: 'easy',
    ingredients: [
      { name: 'Albergínies', quantity: 2, unit: 'unitats' },
      { name: 'Pebrots vermells', quantity: 2, unit: 'unitats' },
      { name: 'Cebes', quantity: 2, unit: 'unitats' },
      { name: "Oli d'oliva verge extra" },
    ],
    steps: [
      {
        instruction: 'Escaliva les verdures senceres a la brasa fins que la pell quedi ben negra.',
      },
      {
        title: 'Suar',
        instruction: 'Tapa-les en un bol perquè suin i es pelin fàcilment.',
        durationMinutes: 20,
      },
      { instruction: 'Pela-les, esquinça-les a tires i amaneix-les amb oli i sal.' },
    ],
  },
  {
    title: 'Melmelada de figues de setembre',
    description: "Melmelada espessa per esmorzar tot l'hivern, feta amb les figues més madures.",
    notes: "Esterilitza els pots bullint-los deu minuts abans d'omplir-los.",
    prepTimeMinutes: 20,
    cookTimeMinutes: 60,
    servings: 8,
    category: 'breakfast',
    season: 'autumn',
    difficulty: 'medium',
    ingredients: [
      { name: 'Figues madures', quantity: 1, unit: 'kg' },
      { name: 'Sucre', quantity: 600, unit: 'g' },
      { name: 'Suc de llimona', quantity: 1, unit: 'unitat' },
    ],
    steps: [
      { instruction: 'Neteja les figues, treu-los la cua i talla-les a quarts.' },
      {
        title: 'Macerar',
        instruction:
          'Barreja-les amb el sucre i el suc de llimona i deixa-les reposar tota la nit.',
        durationMinutes: 480,
      },
      {
        title: 'Coure',
        instruction: 'Cou-ho a foc lent remenant sovint fins que la melmelada napi la cullera.',
        durationMinutes: 60,
      },
      { instruction: "Omple els pots en calent i gira'ls fins que es refredin per fer el buit." },
    ],
  },
];

/**
 * `recipes.search_text` is the normalised title plus every normalised
 * ingredient name, space-joined — the same value `RecipesService` writes on
 * create and update. It is duplicated here on purpose: the service is being
 * rewritten in parallel and extracting a shared helper there would conflict.
 */
function buildSearchText(title: string, ings: Array<{ name: string }>): string {
  return [title, ...ings.map((i) => i.name)]
    .map((part) => normalizeForSearch(part))
    .join(' ')
    .trim();
}

async function seed(db: Database): Promise<void> {
  // Idempotent: deleting the recipes cascades to ingredients and steps.
  await db.delete(recipes);

  for (const recipe of SEED_RECIPES) {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(recipes)
        .values({
          title: recipe.title,
          description: recipe.description,
          notes: recipe.notes,
          prepTimeMinutes: recipe.prepTimeMinutes,
          cookTimeMinutes: recipe.cookTimeMinutes,
          servings: recipe.servings,
          category: recipe.category,
          season: recipe.season,
          difficulty: recipe.difficulty,
          searchText: buildSearchText(recipe.title, recipe.ingredients),
        })
        .returning();

      if (!inserted) {
        throw new Error(`No s'ha pogut inserir la recepta "${recipe.title}"`);
      }

      await tx.insert(ingredients).values(
        recipe.ingredients.map((ing, index) => ({
          recipeId: inserted.id,
          name: ing.name,
          quantity: ing.quantity != null ? ing.quantity.toString() : null,
          unit: ing.unit ?? null,
          position: index,
        })),
      );

      await tx.insert(steps).values(
        recipe.steps.map((step, index) => ({
          recipeId: inserted.id,
          position: index,
          title: step.title ?? null,
          instruction: step.instruction,
          durationMinutes: step.durationMinutes ?? null,
        })),
      );
    });
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL no definit (revisa apps/api/.env)');
    process.exit(1);
  }

  if (isPgliteUrl(url)) {
    const dataDir = parsePglitePath(url);
    console.log(`🐘 PGlite → ${dataDir ?? '(in-memory)'}`);
    const client = dataDir
      ? new PGlite(dataDir, { extensions: PGLITE_EXTENSIONS })
      : new PGlite({ extensions: PGLITE_EXTENSIONS });
    await client.exec(CREATE_EXTENSIONS_SQL);
    const db = drizzlePglite(client, { schema }) as unknown as Database;
    await seed(db);
    await client.close();
    console.log(`✅ ${SEED_RECIPES.length} receptes carregades`);
    return;
  }

  console.log(`🐘 Postgres → ${url.replace(/:[^:@/]+@/, ':***@')}`);
  const client = postgres(url, { max: 1 });
  const db = drizzlePostgres(client, { schema }) as unknown as Database;
  await seed(db);
  await client.end();
  console.log(`✅ ${SEED_RECIPES.length} receptes carregades`);
}

function parsePglitePath(url: string): string | undefined {
  const raw = url.slice(PGLITE_PREFIX.length);
  if (!raw || raw === 'memory' || raw === ':memory:') return undefined;
  if (raw.startsWith('./')) return raw;
  if (raw.startsWith('/')) return raw;
  return `./${raw}`;
}

main().catch((err) => {
  console.error('❌ Error carregant les dades de prova:', err);
  process.exit(1);
});
