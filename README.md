# Receptari

Aplicació per gestionar receptes de cuina. MVP amb CRUD de receptes (ingredients + passos + notes).

> **Estat actual:** arrenca amb **PGlite** (Postgres WASM embegut, zero-config) per evitar bloquejos d'instal·lació a la màquina de desenvolupament. Veure [`docs/postgres-real-setup.md`](docs/postgres-real-setup.md) per la ruta de migració a Postgres real (via `brew install postgresql@16`) un cop s'actualitzi macOS / Xcode.

## Stack

- **Monorepo** amb [pnpm](https://pnpm.io) workspaces
- **API** — [Fastify 5](https://fastify.dev/) + [Drizzle ORM](https://orm.drizzle.team/)
- **DB** — [PostgreSQL 16](https://www.postgresql.org/) via [postgres-js](https://github.com/porsager/postgres) **o** [PGlite](https://github.com/electric-sql/pglite) (Postgres WASM embegut, zero-config)
- **Web** — [Nuxt 3](https://nuxt.com/) (SPA) + [PrimeVue 4](https://primevue.org/) (tema Aura)
- **Validació** — [Zod](https://zod.dev/) (esquemes compartits al package `shared`)
- **Tipus compartits** — `packages/shared` consumit per API i web via workspace protocol
- **Tests** — [Vitest](https://vitest.dev/) + PGlite (DB in-memory per tests API)

## Estructura

```
.
├── apps/
│   ├── api/                # Fastify + Drizzle
│   │   ├── src/
│   │   │   ├── config/         # Validació d'env (Zod)
│   │   │   ├── db/             # Drizzle schema + client (PGlite / postgres-js)
│   │   │   │   ├── client.ts   # createDb() segons DATABASE_URL
│   │   │   │   ├── migrate.ts  # Migrador per a tots dos drivers
│   │   │   │   └── schema.ts
│   │   │   ├── modules/       # Endpoints (recipes, health)
│   │   │   ├── plugins/       # Plugins Fastify (db, error-handler)
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── drizzle/           # Migracions SQL generades
│   │   ├── tests/             # Tests d'integració (PGlite)
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── web/                # Nuxt 3 SPA + PrimeVue
│       ├── pages/             # Rutes: /, /recipes/new, /recipes/[id]
│       ├── components/        # (reservat)
│       ├── composables/
│       │   └── useRecipes.ts  # CRUD cap a l'API
│       ├── tests/             # Tests Vitest (composable)
│       ├── nuxt.config.ts
│       └── package.json
├── packages/
│   └── shared/            # Esquemes Zod compartits
├── docker-compose.yml     # Postgres 16 (opcional, alternativa a PGlite)
├── .env.example           # Variables d'entorn globals
└── package.json
```

## Requisits previs

- **Node.js ≥ 22** (recomanat: `nvm use`)
- **pnpm ≥ 10** (`npm i -g pnpm`)
- ~~Docker / Postgres~~ **No cal!** Per defecte el projecte arrenca amb PGlite (Postgres WASM embegut). Veure [`docs/postgres-real-setup.md`](docs/postgres-real-setup.md) per la ruta de migració a Postgres real.

## Posada en marxa (PGlite — actual)

### 1. Instal·la dependències

```bash
pnpm install
```

### 2. Configura les variables d'entorn

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

El `apps/api/.env` ja ve amb `DATABASE_URL=pglite://./data/receptari` per defecte.

### 3. Aplica les migracions

```bash
pnpm db:migrate
```

Sortida esperada:
```
🐘 PGlite → ./data/receptari
✅ Migracions aplicades
```

### 4. Arrenca API + web en paral·lel

```bash
pnpm dev
```

- **Web**: http://localhost:3001
- **API**: http://localhost:3000

> Si vols canviar el port de la web: `PORT=3001 pnpm --filter @receptari/web dev`.

## Posada en marxa (Postgres real via Docker — opcional)

> Veure [`docs/postgres-real-setup.md`](docs/postgres-real-setup.md) per la ruta completa via `brew install postgresql@16`. El `docker-compose.yml` queda preparat per quan hi hagi Docker o Colima disponible.

Si vols un Postgres compartit o acostumat a l'ecosistema Docker:

### 1. Arrenca Postgres

```bash
pnpm db:up       # docker compose up -d db
pnpm db:logs     # (opcional) veure logs
```

### 2. Apunta l'API al Postgres

Edita `apps/api/.env`:
```
DATABASE_URL=postgres://receptari:receptari@localhost:5432/receptari
```

### 3. Aplica les migracions i arrenca

```bash
pnpm db:migrate
pnpm dev
```

Per aturar la DB: `pnpm db:down`.

## Formats de DATABASE_URL suportats

| URL                                              | Driver       | Persistència              |
| ------------------------------------------------ | ------------ | ------------------------- |
| `pglite://`                                      | PGlite       | In-memory (es perd)       |
| `pglite://./data/receptari`                      | PGlite       | Fitxer `./data/receptari` |
| `pglite:///abs/path/to/db`                       | PGlite       | Path absolut              |
| `postgres://user:pass@host:5432/db`              | postgres-js  | Servidor Postgres real    |

L'API arrenca amb un o altre driver segons el prefix de la URL, sense canvis al codi.

## Tests

```bash
pnpm test              # tots (api + web)
pnpm test:api          # només API (14 tests, ~30-60s amb PGlite per test)
pnpm test:web          # només web (9 tests, ~instant)
```

## Lint i typecheck

```bash
pnpm typecheck         # tots els packages
```

## Build de producció

```bash
pnpm build             # compila API (tsc) + web (nuxt build)
```

## Endpoints API

| Mètode | Ruta                    | Descripció                                  |
| ------ | ----------------------- | -------------------------------------------- |
| GET    | `/api/health`           | Health check                                 |
| GET    | `/api/recipes?q=...`    | Llista (cerca per títol)                     |
| GET    | `/api/recipes/:id`      | Detall amb ingredients + passos              |
| POST   | `/api/recipes`          | Crear (transacció: recipe + ingredients + steps) |
| PATCH  | `/api/recipes/:id`      | Actualitzar (substitueix ingredients + steps) |
| DELETE | `/api/recipes/:id`      | Esborrar (cascadeja ingredients + steps)     |

## Model de dades

- **`recipes`** — `id`, `title`, `description`, `notes`, `prep_time_minutes`, `cook_time_minutes`, `servings`, `created_at`, `updated_at`
- **`ingredients`** — `id`, `recipe_id` (FK CASCADE), `name`, `quantity` NUMERIC, `unit`, `position`
- **`steps`** — `id`, `recipe_id` (FK CASCADE), `position`, `instruction`

Esquemes Zod equivalents a `packages/shared/src/recipe.ts`.

## Pròximes iteracions (idees)

- [ ] Autenticació multi-usuari (Lucia / better-auth)
- [ ] Imatges de recepta (storage S3-compatible)
- [ ] Categories i tags
- [ ] Cerca full-text sobre títol + descripció + notes
- [ ] Importació des d'URL o OCR
- [ ] "Llista de la compra" agregant ingredients
- [ ] i18n (català / castellà / anglès)
- [ ] Tema fosc (botó + `darkModeSelector: '.dark'` ja configurat a PrimeVue)
