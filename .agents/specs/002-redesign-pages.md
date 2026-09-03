---
id: 002
title: Rebuild the web pages against the new design
status: in-progress
created: 2026-09-03
owner: orioltomas
hard_rules: [HR-001, HR-006, HR-009, HR-010, HR-011, HR-013]
depends_on: [001]
---

# Rebuild the web pages against the new design

## Context

Stitch project **"El Meu Receptari Digital"** (`6479379555098272991`), theme
*Heirloom & Harvest*: cream surfaces, terracotta primary `#9b4020`, sage
secondary `#516447`, Playfair Display headings + Inter body, 24px card radius,
pill-shaped floating nav.

Designed screens: `Cerca de Receptes`, `Detall de Recepta`, `Afegir Recepta`.
The design's nav also lists Inici and Favorits, but **neither has a screen** —
resolved below.

The app today has five pages: `index.vue`, `cerca.vue`, `favorits.vue`,
`recipes/new.vue`, `recipes/[id].vue` (which toggles into an inline edit mode),
plus `components/RecipeCard.vue`, `composables/useRecipes.ts` and
`utils/recipes.ts`.

**Depends on spec 001.** The list endpoint's response shape changes and `tags`
and `imageUrl` disappear, so this work cannot start before 001 lands.

## Goal

The web app is exactly the three designed screens plus an edit route, matching
the Heirloom & Harvest system, with no page left that the design does not have.

## Scope

### In
- `/` becomes the search/catalogue screen.
- Recipe detail, add, and edit screens.
- Deleting `index.vue` and `favorits.vue`.
- Reworking the nav.
- Applying the design tokens, including a derived dark palette.

### Out
- Any API or schema change → spec 001.
- Users, accounts, sharing beyond copying a local link.

## Routing changes

| Before | After |
|---|---|
| `/` (Inici) | **deleted**; `/` now serves the catalogue |
| `/cerca` | **merged into `/`**; keep a redirect from `/cerca` |
| `/favorits` | **deleted**; favourites are removed entirely (HR-011) |
| `/recipes/new` | unchanged |
| `/recipes/[id]` | detail only — the inline edit mode is removed |
| — | `/recipes/[id]/edit` — **new**, the add form preloaded |

Nav becomes two items: **Cerca** (`/`) and **Afegir** (`/recipes/new`), plus the
existing light/dark toggle. The design's `person` icon is dropped — there are no
users.

## Screens

### `/` — Catalogue (from *Cerca de Receptes*)

- Editorial header: "Catàleg d'Índex", lead paragraph.
- Search field, debounced, driving `q`.
- Filter chips: **Per Categoria** (the six short labels), **Per Temporada**
  (four seasons + Tot l'any) and **Temps** (`< 30 min` / `30-60 min` /
  `+1 hora`). There is **no Favorits toggle** — favourites are removed by
  HR-011 and return only with multi-user (HR-012).
- "Totes les Receptes (N)" using `total` from the API.
- Sort dropdown: Més recents / Alfabètic (A-Z) / Temps de preparació.
- Recipe cards with category and season chips, time / servings / difficulty
  metadata, description, and "Veure recepta". The design's bookmark icon is
  dropped (HR-011).
- "Mostrant X de N receptes registrades" plus a "Carrega'n més" button that
  raises `offset` and appends.
- Every filter, the sort and the paging go to the API (spec 001) — none of them
  may be faked client-side, which is what `cerca.vue` does today.
- Empty state when nothing matches, and an error state.

### `/recipes/[id]` — Detail

- Breadcrumb from the recipe's own season / category.
- Back link, and the actions: **Preferit**, **Imprimir**, **Compartir**, **Editar**.
- Title, description quote block, and the metadata strip: prep, cook, servings,
  difficulty. A null season or difficulty hides its slot rather than showing a
  placeholder.
- **Ingredients** with a servings scaler (− / +): quantities scale
  proportionally from the recipe's stored `servings`; an ingredient with a null
  quantity ("al gust") never changes; units are displayed verbatim, never
  converted (HR-009). The scaled value is display-only and is never saved.
- Ingredient checkboxes strike through when ticked. State is ephemeral in the
  browser, never persisted.
- **Notes** rendered from the single `notes` field.
- **Steps**: large Playfair numerals, the optional step title and duration shown
  only when present.
- **Imprimir** applies a print stylesheet: no nav, no action bar, ingredients
  and steps on paper.
- **Compartir** copies the current URL and shows the "Copiat!" toast. Note there
  are no public pages — the link only works locally.
- Deleting a recipe **must confirm first** (HR-006), and say the deletion is
  permanent.

### `/recipes/new` and `/recipes/[id]/edit` — Add / Edit

One shared form component; the edit route preloads the recipe and PATCHes,
the new route POSTs. HR-010 means both send the complete recipe.

- Section 01 — title (required), description, servings stepper, prep and cook
  minutes, difficulty selector, season selector, category selector (required,
  long labels).
- Section 02 — the ingredients table: quantity, unit, name, and a remove button
  per row, plus "Afegir ingredient". The unit control is a **suggestion
  dropdown that also accepts free text** (g, ml, unitats, cullerada sopera,
  culleradeta, pessic, branqueta, litres) — HR-009 forbids a closed list, and
  caps a unit at 60 characters.
- Section 03 — steps with the optional title, the instruction, and the optional
  duration, reorderable by position, plus "Afegir pas".
- Notes field. The design's "Maridatge" block is written inside notes; there is
  no separate field.
- **Validation on save** (HR-001): if there is no ingredient or no step, the
  form marks the error and does not submit. The save button stays enabled.
- **Autosaved draft**: the in-progress form is kept in browser storage so
  closing the tab does not lose work, matching the design's "Desat local
  automàtic actiu". The draft is cleared on a successful save and on cancel.
- No image field anywhere — the collection has no images.

## Design system

Add the Heirloom & Harvest tokens to `apps/web/assets/css/main.css`: the colour
set, Playfair Display + Inter, the radius scale (24px containers, 12px controls,
pill nav), and the 8px spacing base. `display-lg` drops to 32px on mobile.

The Stitch design is **light only**, but the app's dark toggle is kept, so the
dark palette has to be derived from the light one rather than copied: keep the
same hue relationships, swap surfaces to deep warm neutrals, and lift the
terracotta toward `#ffb59d` (the theme's own `inverse-primary`) so it stays
legible on dark. Both themes must pass WCAG AA for body text.

## Acceptance criteria

- [ ] `index.vue` and `favorits.vue` no longer exist; `/cerca` redirects to `/`.
- [ ] The nav has exactly Cerca, Afegir and the theme toggle — no `person` icon.
- [ ] Every catalogue filter, the sort and "Carrega'n més" produce an API request; none is computed in the page.
- [ ] The detail scaler doubles a 4-serving recipe's numeric quantities and leaves "al gust" untouched.
- [ ] Ticking an ingredient survives no reload — the state is deliberately ephemeral.
- [ ] Printing the detail page yields ingredients and steps with no nav or buttons.
- [ ] Deleting asks for confirmation and states that it is permanent.
- [ ] Saving with no ingredients, or with no steps, shows the error and does not call the API.
- [ ] Typing a quantity the form cannot interpret (e.g. `0`) tells the user instead of silently saving `null` (HR-009).
- [ ] The detail page has no empty-ingredients state — it is unreachable once the API enforces HR-001.
- [ ] The notes field surfaces the 2000-character limit before submit rather than failing on save (HR-013).
- [ ] Reloading mid-form restores the draft; saving clears it.
- [ ] `/recipes/[id]/edit` loads the recipe and saves it back with no field lost.
- [ ] A recipe with a null season and a null difficulty renders without empty slots.
- [ ] Body text passes WCAG AA in both light and dark.

## Decisions taken

- `/` is the catalogue; Inici and Favorits are deleted. Favourites are removed
  altogether (HR-011), not turned into a filter — the original plan to make them
  a chip on `/` was dropped by the 2026-09-03 hard-rules audit.
- Edit reuses the add form on its own route; inline edit is removed.
- The unit dropdown is open, not closed (HR-009, which superseded HR-003).
- The scaler and the ingredient checkboxes are display-only, never persisted.
- The form never loses typed input silently: an uninterpretable quantity is
  reported, not discarded (HR-009).
- The 2000-char cap on notes is shown in the form, and stays a Zod rule with no
  DB constraint (HR-013).
- Dark mode is kept and its palette derived from the light design.

## Issues

Created 2026-09-03 with `/spec-to-issues` (`orioltomas/receptari`):

- #6 — Design system: Playfair Display, spacing scale, WCAG AA (no dependencies)
- #7 — Web foundation: Catalan labels, quantity helpers, scaler, API client (blocked by spec 001 #2, #3)
- #8 — App shell: nav reduced to Cerca, Afegir, theme toggle (blocked by #5)
- #9 — Catalogue at `/`: server-side search, filters, sort, paging (blocked by #7)
- #10 — Recipe detail: scaler, print, share, delete confirmation (blocked by #7)
- #11 — Add/edit form: one component, two routes, draft autosave (blocked by #7)

#6 can start immediately — it is pure CSS and typography and touches nothing
spec 001 changes. #7 is this spec's foundation, the web counterpart of #2;
#9, #10 and #11 run in parallel once it lands and share no file. #8 depends only
on #5, not on #7.

## Open questions

None.
