---
id: 001
title: Rework the recipe model and API for the new design
status: ready
created: 2026-09-03
owner: orioltomas
hard_rules: [HR-001, HR-002, HR-003, HR-005, HR-006]
---

# Rework the recipe model and API for the new design

## Context

The Stitch design **"El Meu Receptari Digital"** (project `6479379555098272991`,
theme *Heirloom & Harvest*) defines three screens — Cerca de Receptes, Detall de
Recepta, Afegir Recepta — that need data the current model does not have, and
drop data it does have.

Today:

- `apps/api/src/db/schema.ts` — `recipes` (with `tags` as a comma-joined string
  and `image_url`), `ingredients`, `steps` (instruction only).
- `packages/shared/src/recipe.ts` — the Zod schemas both apps import.
- `apps/api/src/modules/recipes/recipes.service.ts` — `list()` hardcodes
  `created_at DESC`, no limit, and searches `ilike(recipes.title, …)` only.
- `apps/web/utils/recipes.ts` — season is inferred by matching tag strings.

This spec covers **the data model, the shared schemas and the API only**. The
pages are spec 002, which depends on this one.

It also resolves the two conformance gaps recorded against HR-001 and HR-005.
They live here rather than in their own spec because they change the same two
files (`packages/shared/src/recipe.ts`, `recipes.service.ts`) as everything
else below; splitting them would guarantee a merge conflict between parallel
agents.

## Goal

The recipe model carries a real classification (category, season, difficulty),
richer steps, and no images; and the list endpoint supports the filtering,
sorting, paging and ingredient-aware search the design and the hard rules
require.

## Scope

### In
- New `category`, `season`, `difficulty` columns; removal of `tags`.
- Removal of `image_url`.
- `title` and `duration_minutes` on steps.
- Enforcing at least one ingredient and one step (HR-001).
- Search across title **and** ingredient names, accent-insensitive (HR-005).
- Server-side filtering, sorting and paging on `GET /recipes`.
- A seed script, and a destructive migration of the local dev database.

### Out
- Every page and component change → spec 002.
- Users, auth, sharing, public pages.
- A `pairing` field, structured multi-note support, and a sequential folio
  number — all explicitly rejected during grilling.

## Data model

### `recipes`

| Column | Change |
|---|---|
| `category` | **new**, `varchar(20) NOT NULL`. One of the enum keys below. |
| `season` | **new**, `varchar(20) NULL`. One of the enum keys below. |
| `difficulty` | **new**, `varchar(20) NULL`. One of the enum keys below. |
| `tags` | **dropped**. |
| `image_url` | **dropped**. |
| `search_text` | **new**, `text NOT NULL DEFAULT ''`. See *Search* below. |

Index `recipes_category_idx` on `category`. Keep `recipes_created_at_idx`.
Add `recipes_title_idx` on `title` for the alphabetical sort.

### `steps`

| Column | Change |
|---|---|
| `title` | **new**, `varchar(120) NULL`. |
| `duration_minutes` | **new**, `integer NULL`, non-negative. |

### `ingredients`

Unchanged. `unit` stays free text — HR-003 is untouched. The design's unit
dropdown is a **suggestion list in the UI only** (spec 002); the API accepts any
string.

### Enums — stable keys, presentation labels live in the web app

Store the key. Never store the label; the label can change without a migration.

```
category:   breakfast | lunch | dinner | dessert | snack | bread
season:     spring | summer | autumn | winter | all_year
difficulty: easy | medium | hard
```

The design uses two different label sets for category, so the web app keeps
both and picks per context:

| key | short label (filter chips, cards) | long label (add/edit form) |
|---|---|---|
| `breakfast` | Esmorzars | Esmorzar · Brunch |
| `lunch` | Dinars | Dinar principal |
| `dinner` | Sopars | Sopar de repòs |
| `dessert` | Postres | Postres · Dolç |
| `snack` | Pica-pica | Pica-pica |
| `bread` | Pa i Masses | Pa · Forn artesà |

Seasons: Primavera / Estiu / Tardor / Hivern / Tot l'any.
Difficulties: Fàcil / Mitjana / Avançada.

### Migration and existing data

The only database is the local PGlite dev database holding throwaway test
recipes. The migration is **destructive by decision**: drop and recreate, then
run a new seed script. No mapping of old tags is attempted.

Deliverables: the Drizzle migration, plus `apps/api/src/db/seed.ts` wired to a
`pnpm db:seed` script, producing a handful of recipes that exercise every
category, a null season, a null difficulty, and an ingredient with a null
quantity ("Sal i pebre — al gust").

## Contracts

### Shared schemas (`packages/shared/src/recipe.ts`)

- Add `categorySchema`, `seasonSchema`, `difficultySchema` as `z.enum` over the
  keys above, and export the key arrays so the web app can build its selectors.
- `recipeSchema` / `recipeSummarySchema`: add `category`, `season`,
  `difficulty`; remove `tags` and `imageUrl`.
- `stepSchema`: add `title` (`.max(120).nullable().default(null)`) and
  `durationMinutes` (`.int().nonnegative().nullable().default(null)`).
- `createRecipeInputSchema`:
  - `category` required, `season` and `difficulty` nullable with `null` default;
  - **`ingredients` becomes `.min(1, 'Cal com a mínim un ingredient')`** (HR-001);
  - `steps` keeps `.min(1, 'Cal com a mínim un pas')`;
  - drop `tags` and `imageUrl`.
- `updateRecipeInputSchema` stays identical to create — HR-004 (saving replaces
  the whole recipe) is unchanged.
- `listRecipesQuerySchema` gains:

```ts
q?: string
category?: CategoryKey
season?: SeasonKey
difficulty?: DifficultyKey
time?: 'lt30' | '30to60' | 'gt60'
favorite?: boolean
sort?: 'recent' | 'alpha' | 'prep'   // default 'recent'
limit?: number   // 1..50, default 6
offset?: number  // >= 0, default 0
```

### `GET /recipes` — **breaking response change**

Returns a page, not a bare array, because the design shows "Mostrant 6 de 18":

```ts
{ items: RecipeSummary[]; total: number }
```

`total` is the count matching the filters, ignoring `limit`/`offset`.

Sorting:
- `recent` → `created_at DESC` (default, current behaviour)
- `alpha` → `title ASC`
- `prep` → `prep_time_minutes ASC`, **nulls last**

The `time` filter buckets on `prep_time_minutes + cook_time_minutes`, treating a
null part as 0. A recipe with both null is excluded from every bucket rather
than landing in `lt30` — an unfilled time is unknown, not zero.

All other endpoints keep their current shape.

## Search (HR-005)

Search matches the recipe **title** and its **ingredient names**,
case-insensitively and **accent-insensitively**, and a multi-word query requires
**every** word to match somewhere (title or any ingredient).

`unaccent` is **not available in PGlite** — it ships `pg_trgm`, `citext`,
`fuzzystrmatch` and others, but not `unaccent` — and the project must keep
running on both PGlite and real Postgres. So normalisation is done in the
application, not by a Postgres extension:

- A helper `normalizeForSearch(s)` in `packages/shared` lowercases and strips
  diacritics via `s.normalize('NFD').replace(/\p{Diacritic}/gu, '')`.
- `recipes.search_text` holds the normalised title plus every normalised
  ingredient name, space-joined. It is rewritten inside the same transaction on
  every create and update — `update` already replaces ingredients wholesale
  (HR-004), so there is exactly one place to maintain it.
- `list()` normalises the incoming `q`, splits it on whitespace, and requires
  `search_text ILIKE '%<word>%'` for every word.
- Index `recipes_search_text_trgm_idx` using `gin_trgm_ops` on `search_text`.

This removes the join and the `DISTINCT` a live ingredient search would need,
and behaves identically on both drivers.

## Acceptance criteria

- [ ] A recipe cannot be created or updated with zero ingredients or zero steps; the API answers 400 with the Catalan message from the schema.
- [ ] `GET /recipes?q=arros` returns the recipe titled "Arròs…" (accent-insensitive).
- [ ] `GET /recipes?q=bolets` returns a recipe whose title lacks the word but which has an ingredient named "Ceps i bolets frescos".
- [ ] `GET /recipes?q=arros bolets` returns only recipes matching both words.
- [ ] `GET /recipes?limit=6&offset=0` returns 6 items and the unpaged `total`.
- [ ] `sort=alpha` and `sort=prep` order correctly, with null prep times last.
- [ ] `category`, `season`, `difficulty` and `time` filter, and combine with `q` and `favorite`.
- [ ] Creating a recipe with a category outside the enum is rejected.
- [ ] An ingredient with `unit: "branqueta"` — outside the design's dropdown — is accepted (HR-003).
- [ ] `search_text` is correct after an update that renames an ingredient.
- [ ] `pnpm db:migrate && pnpm db:seed` gives a working database from scratch.
- [ ] No reference to `tags` or `imageUrl` remains in `packages/shared` or `apps/api`.

## Decisions taken

- Category, season and difficulty become real columns and `tags` is removed
  entirely → **HR-002 must be superseded**, it describes tag storage that will
  no longer exist.
- The recipe collection carries no images → **new hard rule needed**.
- Unit selection is a UI suggestion, not a constraint → HR-003 stands unchanged.
- Steps gain an optional title and duration; notes stay a single free-text
  field; no pairing field; no folio number.
- Sorting and paging move to the server.
- Accent-insensitivity via an application-maintained `search_text` column, since
  PGlite has no `unaccent`. Technical decision, not a business rule.

## Open questions

None.
