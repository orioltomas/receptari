# Hard rules

Binding **business decisions** for this project. Anything here overrides a new
request: if a feature contradicts a rule, stop and resolve the conflict with the
project owner before writing code.

Rules are append-only. Never delete one — supersede it.

Managed by the `hard-rules` skill.

---

## HR-001 — A recipe needs at least one ingredient and at least one step
- **Status:** active
- **Decided:** 2026-09-03
- **Rule:** A recipe cannot be created or saved with an empty ingredient list or an empty step list. Both must contain at least one entry.
- **Why:** Something with no ingredients or no method is a note, not a recipe. Allowing empties produces useless entries that still occupy the collection and the search index.
- **Applies to:** `createRecipeInputSchema` / `updateRecipeInputSchema` in `packages/shared`, `RecipesService.create`/`update`, the new-recipe and edit forms.
- **⚠️ Conformance:** the API does NOT satisfy this yet — `createRecipeInputSchema.ingredients` uses `.min(0)`; only `steps` enforces `.min(1)`. The web forms partly do: both `new.vue` and `[id].vue` disable removing the last ingredient and block a submit with zero steps, but `[id].vue` still renders an empty-ingredients state for data the rule says cannot exist. Covered by spec 001 (the API rule) and spec 002 (the stale empty-ingredients state on the detail page).
- **Source:** session 2026-09-03

## HR-002 — Tags are short, comma-free and capped at 10 per recipe
- **Status:** superseded by HR-007
- **Decided:** 2026-09-03
- **Superseded:** 2026-09-03
- **Rule:** A recipe carries at most 10 tags; each tag is at most 20 characters and may not contain a comma.
- **Why:** Tags are stored denormalised as a comma-separated string in `recipes.tags` rather than in their own table. The comma is the separator, and the cap keeps the column and the UI bounded. Any feature needing a global tag list, renaming or tag statistics has to revisit this storage decision first.
- **Applies to:** `tagSchema` in `packages/shared`, `parseTags`/`serializeTags` in `recipes.service.ts`, tag inputs in the web forms.
- **Source:** session 2026-09-03

## HR-003 — Quantities and units are free-form
- **Status:** superseded by HR-009
- **Decided:** 2026-09-03
- **Superseded:** 2026-09-03
- **Rule:** An ingredient's `quantity` may be absent, and `unit` is free text with no controlled vocabulary. The app never converts, normalises or does arithmetic across units.
- **Why:** Real recipes say "sal al gust" and "un pessic". Forcing a unit list or a numeric quantity would reject valid input. The cost is that servings scaling and shopping-list aggregation are not possible without changing this rule.
- **Applies to:** `ingredientSchema` in `packages/shared`, the `ingredients.quantity` / `ingredients.unit` columns.
- **Source:** session 2026-09-03

## HR-004 — Updating a recipe replaces it entirely
- **Status:** superseded by HR-010
- **Decided:** 2026-09-03
- **Superseded:** 2026-09-03
- **Rule:** Saving a recipe sends its complete state. Ingredients and steps are replaced wholesale, and their `position` is derived from the order of the arrays in the payload. There is no partial field update and no per-ingredient or per-step endpoint. The one exception is the favourite flag, which has its own endpoint.
- **Why:** The editor always holds the whole recipe, so a full replace removes any need for diffing or ordering protocols. Concurrent editing is out of scope — last write wins.
- **Applies to:** `PATCH /recipes/:id`, `updateRecipeInputSchema`, `RecipesService.update`.
- **Source:** session 2026-09-03

## HR-005 — Search matches recipe titles and ingredient names
- **Status:** active
- **Decided:** 2026-09-03
- **Rule:** The `q` search parameter matches against a recipe's title **and** the names of its ingredients. A recipe is returned if either matches. Description, notes, steps and tags are not searched.
- **Why:** "What can I cook with what I have?" is a primary use of the app; title-only search cannot answer it. Steps and notes are excluded to keep results precise.
- **Applies to:** `GET /recipes?q=`, `RecipesService.list`, the `/cerca` page.
- **⚠️ Conformance:** the code does NOT satisfy this yet. `RecipesService.list` only does `ilike(recipes.title, ...)`. Covered by spec 001.
- **Source:** session 2026-09-03

## HR-006 — Deleting a recipe is permanent and cascades
- **Status:** active
- **Decided:** 2026-09-03
- **Rule:** Deleting a recipe permanently removes it together with its ingredients and steps. There is no trash, no soft delete and no undo. The UI must therefore confirm before deleting.
- **Why:** A single-user personal collection does not justify the complexity of a recovery flow. The confirmation step is the safeguard, so it is part of the rule, not a UI detail.
- **Applies to:** `DELETE /recipes/:id`, the `onDelete: 'cascade'` foreign keys on `ingredients` and `steps`, the delete action on the recipe detail page.
- **Source:** session 2026-09-03

## HR-007 — A recipe is classified by category, season and difficulty, not by free tags
- **Status:** active
- **Decided:** 2026-09-03
- **Supersedes:** HR-002
- **Rule:** Every recipe has exactly one `category` from a closed list, and optionally one `season` and one `difficulty`, also from closed lists. Free-form tags do not exist. The stored value is a stable internal key; the Catalan label shown to the user is presentation and may change without a migration.
- **Why:** Filtering by meal, season and effort is the main way the collection is browsed, and free tags cannot guarantee that every recipe is classified exactly once. Fixing the vocabulary makes the filters exact and indexable; keeping keys separate from labels means the wording can be reworded without touching data.
- **Applies to:** `recipes.category` / `season` / `difficulty`, the enum schemas in `packages/shared`, the catalogue filters, the add/edit form.
- **Source:** spec 001

## HR-008 — The receptari has no images
- **Status:** active
- **Decided:** 2026-09-03
- **Rule:** Recipes carry no photography or illustration. There is no image field, no upload and no image URL.
- **Why:** The receptari is a written kitchen journal — "sense imatges, text pur". Text-only keeps every recipe equally complete, removes the pressure to photograph a dish before recording it, and avoids storage and hosting entirely. Any feature proposing thumbnails, galleries or uploads contradicts this and has to be raised first.
- **Applies to:** the `recipes` table, `recipeSchema` / `recipeSummarySchema`, recipe cards, the detail page, the add/edit form.
- **Source:** spec 001

## HR-009 — Quantities and units are free-form within explicit limits
- **Status:** active
- **Decided:** 2026-09-03
- **Supersedes:** HR-003
- **Rule:** An ingredient's `quantity` may be absent, and `unit` is free text with no controlled vocabulary — but `unit` is capped at **60 characters**. A quantity, when given, must be greater than zero; `0` is not a valid quantity. Input the app cannot interpret is **never silently discarded**: if a typed quantity resolves to nothing usable, the user is told, rather than having it quietly become `null`. The app still never converts, normalises or does arithmetic *across units*.
- **Why:** HR-003 said units were free text with no restriction, but the code capped them at 20 characters and rejected the rule's own example — "un pessic de sal marina" (23 chars) returned a 400, and the web form routes all non-numeric input into `unit`, so this was the normal path, not an edge case. 60 characters covers real phrasing like "una branqueta de romaní fresc" while still bounding the column. The no-silent-loss clause exists because `parseQuantityInput` turned a `0` into `null` without telling anyone, which loses user input.
- **Applies to:** `ingredientSchema` in `packages/shared`, the `ingredients.quantity` / `ingredients.unit` columns, `parseQuantityInput` in `apps/web/utils/recipes.ts`, the ingredient rows in the add and edit forms.
- **⚠️ Conformance:** the code does NOT satisfy this yet — `unit` is still `varchar(20)` / `.max(20)`, and `parseQuantityInput` still discards a `0` silently. Covered by spec 001 (the 60-char cap) and spec 002 (making the loss visible in the form).
- **Source:** session 2026-09-03 (bootstrap hard-rules audit)

## HR-010 — Updating a recipe replaces it entirely, with no exceptions
- **Status:** active
- **Decided:** 2026-09-03
- **Supersedes:** HR-004
- **Rule:** Saving a recipe sends its complete state. Ingredients and steps are replaced wholesale, and their `position` is derived from the order of the arrays in the payload. There is no partial field update and no per-ingredient or per-step endpoint. There is **no exception** — every field of a recipe travels through the one update endpoint.
- **Why:** identical to HR-004, minus its one carve-out. HR-004 exempted the favourite flag because it had its own endpoint; favourites are removed by HR-011, so the exception now describes something that does not exist. When favourites return they will be per-user (HR-012) and will therefore not be a field of the recipe at all, so the carve-out should not come back with them.
- **Applies to:** `PATCH /recipes/:id`, `updateRecipeInputSchema`, `RecipesService.update`.
- **Source:** session 2026-09-03 (bootstrap hard-rules audit)

## HR-011 — Favourites are removed until they are redesigned per user
- **Status:** active
- **Decided:** 2026-09-03
- **Rule:** The app has no favourites. The `recipes.is_favorite` column, the `POST /recipes/:id/favorite` endpoint, the `isFavorite` field in every shared schema, the `favorite` list filter, the `/favorits` page and every favourite toggle are removed. Favourites return only as part of the multi-user work (HR-012), as a per-user relation — never as a boolean on the recipe.
- **Why:** `is_favorite` is a single global boolean, which is exactly the shape that multi-user breaks: once each registered user saves their own favourites it must become a `user × recipe` relation. Keeping the boolean while that is known to be coming means building on a shape that is already decided to be wrong, and spec 001 was actively deepening the dependency through its `favorite` filter. Spec 001's migration is destructive anyway, so removing it now is nearly free.
- **Applies to:** the `recipes` table, `recipeSchema` / `recipeSummarySchema` / `createRecipeInputSchema` / `listRecipesQuerySchema` / `toggleFavoriteInputSchema` in `packages/shared`, `RecipesService.setFavorite`, `apps/web/pages/favorits.vue`, `RecipeCard.vue` and the toggles in `index.vue`, `cerca.vue` and `recipes/[id].vue`.
- **⚠️ Conformance:** favourites are still fully present in the code. Covered by spec 001 (the column, endpoint and schemas) and spec 002 (the page and the toggles).
- **Source:** session 2026-09-03 (bootstrap hard-rules audit)

## HR-012 — Receptari becomes multi-user: public reading, authored writing
- **Status:** active
- **Decided:** 2026-09-03
- **Rule:** The receptari is destined to be published with authentication. Anyone, signed in or not, can browse and search recipes. Only a registered user can create a recipe, and **each recipe has an author who alone may edit or delete it**. Saving favourites is likewise for registered users only, and is per user. None of this is built yet — but no work may cement single-user assumptions that would have to be undone, and any feature touching ownership, visibility or per-user state must be checked against this rule first.
- **Why:** the code today has no auth, no users and no ownership whatsoever, and `reference.md` described that as a permanent property ("the whole database is one person's collection"). That was never a decision, only the current state. Recording the intended direction stops agents from treating single-user as settled — the favourites boolean (HR-011) is exactly the kind of decision that would have had to be undone.
- **Applies to:** the future `users` table and recipe ownership, `apps/api` route authorisation, favourites when they return, and the `Recipe` / `Receptari` / `Favorite` entries in `reference.md`.
- **⚠️ Conformance:** nothing is implemented. The API has no authentication of any kind and `CORS_ORIGIN` defaults to a single localhost origin. This rule records direction, not current behaviour; it needs its own grilling session before any of it is built.
- **Source:** session 2026-09-03 (bootstrap hard-rules audit)

## HR-013 — A recipe's description and notes are capped at 2000 characters
- **Status:** active
- **Decided:** 2026-09-03
- **Rule:** `description` and `notes` each accept at most 2000 characters. The limit is deliberate and is enforced in the shared schema; the database columns stay unbounded `text`.
- **Why:** the cap already existed in `createRecipeInputSchema` but was an unexplained schema detail rather than a recorded decision, so an agent could reasonably have raised or removed it while "cleaning up" the mismatch with the unbounded `text` column. 2000 characters is enough for a recipe's story and keeps list payloads bounded. The column stays `text` on purpose — the limit is a product decision, not a storage one, and moving it should not require a migration.
- **Applies to:** `createRecipeInputSchema` in `packages/shared`, the `recipes.description` / `recipes.notes` columns.
- **Source:** session 2026-09-03 (bootstrap hard-rules audit)

## HR-014 — The Stitch design is a visual reference, never a source of business decisions
- **Status:** active
- **Decided:** 2026-09-06
- **Rule:** From the Stitch project *"El Meu Receptari Digital"* (`6479379555098272991`) the app takes **colour, typography, sizing, spacing, radii and composition only**. Anything the design implies about *what exists* — a field, an entity, a capability, a permission — carries no authority. Where a screen depicts something an active hard rule forbids, the rule wins and the element is not built; where the design is silent on something the product already has, the design's silence is not a decision to remove it.
- **Why:** the design was drawn before several rules existed and keeps depicting the app as it was, so reading it as a source of truth quietly reintroduces decisions that were deliberately taken. Three of its elements contradicted active rules at once: bookmark controls in three places (HR-011 removed favourites until they are per-user), a closed unit dropdown (HR-009 keeps units free text so "un pessic de sal marina" stays valid), and a user avatar implying a session (HR-012 — multi-user is decided but unbuilt). The converse trap is as costly: the design has no dark palette and hides its navigation on mobile, neither of which is a decision to drop a working theme or leave phones without navigation.
- **Applies to:** every task that consults the Stitch screens — `apps/web` pages, components and `assets/css/main.css` — and any future regeneration of the design.
- **Source:** session 2026-09-06
