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
- **⚠️ Conformance:** the code does NOT satisfy this yet. `ingredientSchema` arrays use `.min(0)`; only steps enforce `.min(1)`. Covered by spec 001.
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
- **Status:** active
- **Decided:** 2026-09-03
- **Rule:** An ingredient's `quantity` may be absent, and `unit` is free text with no controlled vocabulary. The app never converts, normalises or does arithmetic across units.
- **Why:** Real recipes say "sal al gust" and "un pessic". Forcing a unit list or a numeric quantity would reject valid input. The cost is that servings scaling and shopping-list aggregation are not possible without changing this rule.
- **Applies to:** `ingredientSchema` in `packages/shared`, the `ingredients.quantity` / `ingredients.unit` columns.
- **Source:** session 2026-09-03

## HR-004 — Updating a recipe replaces it entirely
- **Status:** active
- **Decided:** 2026-09-03
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
