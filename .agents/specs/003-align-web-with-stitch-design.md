---
id: 003
title: Align the web app with the Stitch design
status: in-progress
created: 2026-09-06
owner: orioltomas
hard_rules: [HR-006, HR-007, HR-008, HR-009, HR-011, HR-012, HR-014]
---

# Align the web app with the Stitch design

## Issues

| # | Title | Depends on |
|---|---|---|
| [#24](https://github.com/orioltomas/receptari/issues/24) | Design tokens, fonts and stylesheet split | — |
| [#25](https://github.com/orioltomas/receptari/issues/25) | App shell: the design's fixed top header | #24 |
| [#26](https://github.com/orioltomas/receptari/issues/26) | Catalogue page and recipe card | #24 |
| [#27](https://github.com/orioltomas/receptari/issues/27) | Recipe detail: two-column layout, step cards and ingredient check-off | #24 |
| [#28](https://github.com/orioltomas/receptari/issues/28) | Add and edit form: two-column registration layout | #24 |
| [#29](https://github.com/orioltomas/receptari/issues/29) | Contrast and visual-fidelity review | #25, #26, #27, #28 |

## Context

The Stitch project **"El Meu Receptari Digital"** (`6479379555098272991`) holds
three desktop screens — `Cerca de Receptes`, `Detall de Recepta`,
`Afegir Recepta`. Specs 001 and 002 were written against an earlier state of
that design and their descriptions of it are wrong: they say *Playfair Display +
Inter*, terracotta `#9b4020` and 24px card radii. The design as it stands today
says none of those things.

What the web app has today, after specs 001 and 002:

- `apps/web/assets/css/main.css` (1553 lines) — the whole design system as CSS
  custom properties: Playfair Display + Inter, primary `#7c290a`, a **sage green**
  secondary `#516447`, 24px containers (`--radius-xl`) and `9999px` pills.
- `apps/web/app.vue` — a top-left nav cluster **and** a floating bottom pill,
  both carrying Cerca / Afegir / theme toggle.
- `apps/web/pages/index.vue` — the catalogue, headed `<h1>Catàleg d'Índex</h1>`.
- `apps/web/pages/recipes/[id]/index.vue` (690 lines) — the detail page, with a
  servings scaler, print, share and delete confirmation, and a `@media print`
  block.
- `apps/web/pages/recipes/new.vue` + `[id]/edit.vue`, both rendering
  `components/RecipeForm.vue` (566 lines).
- `apps/web/components/RecipeCard.vue`, `utils/recipes.ts` (Catalan label
  tables), `composables/useRecipes.ts`.

The gap is the whole presentation layer: type, colour, radii, spacing scale,
the shell, and the composition of all four pages.

## Goal

The web app should look like the Stitch screens. Every design token matches the
Stitch config exactly, and each page reproduces the design's composition —
while the behaviour built in specs 001 and 002 keeps working unchanged and no
element the hard rules forbid is reintroduced (HR-014).

## Scope

### In

- The design-token layer in `assets/css/main.css`: colour, typography, radii,
  spacing, and a dark palette derived from the new colours.
- The app shell (`app.vue`): the design's fixed top header, plus the existing
  mobile bottom navigation.
- The four pages: catalogue (`/`), detail, new, edit — and `RecipeCard.vue`
  and `RecipeForm.vue`.
- One new client-side interaction: checking off ingredients on the detail page.

### Out

- **The API, the shared schemas, the database.** This spec changes no field, no
  endpoint, no migration. Nothing in it requires one.
- Favourites, in any form (HR-011, HR-014).
- Users, avatars, authorship as real data (HR-012).
- A folio / recipe number field.
- Changing the classification vocabulary or its Catalan labels (HR-007).
- Changing search, filtering, sorting or paging behaviour.
- Visual-regression test infrastructure.

## Actors & permissions

Unchanged — the app has no users yet (HR-012). The single implicit user can do
everything, exactly as today.

## Behaviour

Behaviour is unchanged from specs 001 and 002 in every respect but one. The one
addition, on the recipe detail page:

1. Each ingredient row is clickable.
2. Clicking one marks it as done: the checkbox fills and the name is de-emphasised.
3. Clicking it again unmarks it.
4. The state is per-session and in-memory only. Reloading the page, or navigating
   away and back, clears it. It is never sent to the API and never stored in the
   browser.

## Edge cases & error handling

| Case | Expected behaviour |
|---|---|
| Loading, empty, error and paging states | The design draws none of them. Keep the current behaviour exactly; restyle with the new tokens (HR-014 — the design's silence is not a decision to remove them). |
| Viewport below `sm` (640px) | The design hides its navigation entirely. Do **not** follow it: the header's nav cluster hides, and the existing floating bottom pill takes over, as built in issue #8. |
| Dark theme | The design defines `darkMode: "class"` but ships no dark palette. Derive one from the new colours, keeping the WCAG AA contrast validated in issue #6. |
| A recipe with no season or no difficulty | Both are optional (HR-007). The slot is omitted, not rendered empty — as today. |
| Ingredient check-off with a scaled servings count | Changing the servings does not clear the checked set; the rows keep their identity. |
| Printing the detail page | The `@media print` block must keep working against the new tokens. Checked-off state is not printed. |

## Data model

**No changes.** No new column, no migration, no backfill.

Two things the design depicts have no field behind them and are **not** built:

- `Folio Nº 084` / `Recepta #084` — no such field, and none is added.
- `Arrossos`, a third classification chip on the detail page — HR-007 fixes the
  axes at category, season and difficulty, and removed free tags. Only those
  three chips are rendered.

## Contracts

**No changes.** No endpoint, payload, validation rule or shared type is touched.

## UI / UX

### Design tokens — exact values from the Stitch config

These replace the values in `assets/css/main.css`. They are the light palette;
`:root` carries them.

```
--primary: #6d2409;            --on-primary: #ffffff;
--primary-container: #8c3a1e;  --on-primary-container: #ffb6a0;
--secondary: #705a4f;          --on-secondary: #ffffff;
--secondary-container: #fbdcce; --on-secondary-container: #766055;
--tertiary: #004251;           --on-tertiary: #ffffff;
--tertiary-container: #005b6f;
--surface / --background: #fcf9f5;   --surface-bright: #fcf9f5;
--surface-container-lowest: #ffffff; --surface-container-low: #f6f3ef;
--surface-container: #f0edea;        --surface-container-high: #eae8e4;
--surface-container-highest / --surface-variant: #e5e2de;
--surface-dim: #dcdad6;              --surface-tint: #9a4528;
--on-surface: #1c1c1a;               --on-surface-variant: #55433d;
--outline: #88726c;                  --outline-variant: #dcc1b9;
--error: #ba1a1a;                    --on-error: #ffffff;
--error-container: #ffdad6;          --on-error-container: #93000a;
--inverse-surface: #31302e;          --inverse-on-surface: #f3f0ed;
--inverse-primary: #ffb59e;
--primary-fixed: #ffdbd0;            --primary-fixed-dim: #ffb59e;
--on-primary-fixed: #390b00;         --on-primary-fixed-variant: #7b2e13;
--secondary-fixed: #fbdcce;          --secondary-fixed-dim: #dec1b3;
--on-secondary-fixed: #281810;       --on-secondary-fixed-variant: #574238;
```

Note the two most visible changes from today: the secondary is a **warm brown**,
not sage green, and the surface warms from `#fbf9f5` to `#fcf9f5`.

**Typography.** Newsreader (display) + Work Sans (body), both from Google Fonts,
replacing Playfair Display + Inter in `nuxt.config.ts`. The full scale, verified
against the rendered design:

| Token | Size / line-height | Weight | Tracking | Family |
|---|---|---|---|---|
| `headline-display` | 44px / 52px | 400 | -0.02em | Newsreader |
| `headline-display-mobile` | 32px / 40px | 400 | -0.015em | Newsreader |
| `headline-lg` | 32px / 40px | 400 | -0.015em | Newsreader |
| `headline-lg-mobile` | 26px / 34px | 400 | -0.01em | Newsreader |
| `headline-md` | 22px / 30px | 400 | — | Newsreader |
| `headline-sm` | 18px / 24px | 500 | — | Newsreader |
| `step-numeral` | 18px / 22px | 400 | 0.02em | Newsreader |
| `body-lg` | 17px / 28px | 400 | — | Work Sans |
| `body-md` | 15px / 24px | 400 | — | Work Sans |
| `body-sm` | 13px / 20px | 400 | — | Work Sans |
| `label-lg` | 13px / 18px | 500 | 0.04em | Work Sans |
| `label-md` | 11px / 16px | 600 | 0.08em | Work Sans |
| `label-sm` | 10px / 14px | 600 | 0.1em | Work Sans |

**Radii.** The current 24px containers and `9999px` pills are wrong at every
level. Confirmed against computed styles in the rendered design:

| Element | Radius |
|---|---|
| Cards, panels, form sections (`rounded-xl`) | **8px** |
| Nav container, season pills (`rounded-full`) | **12px** |
| Filter chips, inputs, selects, step cards (`rounded-lg`) | **4px** |
| Small tag chips (`rounded`) | **2px** |

Nothing in this design is a capsule.

**Spacing and layout widths.**

```
space-3xs .125rem  space-2xs .25rem  space-xs .5rem   space-sm .75rem
space-md  1rem     space-lg  1.5rem  space-xl 2.25rem space-2xl 3.5rem
space-3xl 5rem
margin-mobile 1.25rem  margin-tablet 2.5rem  margin-desktop 4rem
gutter-mobile 1rem     gutter-tablet 1.5rem  gutter-desktop 2.5rem
journal-max-width 72rem   column-reading-width 42rem
```

### App shell

A **fixed top header**, `h-16`, `bg-surface/90` with a backdrop blur, its
contents constrained to `journal-max-width`:

- Left: the wordmark **Receptari Digital**, `headline-md`, linking to `/`.
- Centre-right: the nav container (`surface-container-low`, 12px radius, a very
  soft shadow) holding exactly two links — **Cerca** (`/`) and **Afegir**
  (`/recipes/new`). The active one is filled `primary` on `on-primary`; the rest
  are `on-surface-variant`. Both keep exact-match activation, as today.
- Right: the **theme toggle**. The design puts a user avatar here; it is not
  built (HR-012, HR-014) and the toggle takes its place.

Below `sm`, the header nav hides and the existing floating bottom pill is shown.
Main content is `pt-16`.

Page headers begin directly with the `<h1>`. The design's editorial eyebrows
(`RECEPTARI EDITORIAL · CATÀLEG D'ÍNDEX`, `VOLUM III · FOLI DE REGISTRE`) and
its page footer (`Culinary Journal` / `Edició d'Arxiu · MMXXV`) are **not**
built.

### Catalogue (`/`)

- `<h1>` is **`Cerca`**, in `headline-display`. The current `Catàleg d'Índex` is
  the design's eyebrow text mistakenly promoted to a heading, and goes away.
- A lead paragraph in `body-lg`, capped at `column-reading-width`.
- The search field: full width, `surface-container-low`, a leading `search`
  icon, and an italic `headline-sm` placeholder.
- The filters sit inside **one `surface-container-low` panel** at 8px radius,
  as three rows — `Per Categoria:`, `Per Temporada:`, `Temps:` — each a
  `label-sm` uppercase caption of at least 120px against a wrapping row of 4px
  chips, the rows separated by 1px `surface-container-highest` rules. The
  selected chip is `primary` / `on-primary`; the rest are `surface-container`.
- The results header: `Totes les Receptes` in `headline-lg` beside an italic
  `headline-sm` count in parentheses, with `Ordena per:` and the sort select on
  the right. The three sort options already match the shared schema
  (`recent` / `alpha` / `prep`).
- The grid is 1 / 2 / 3 columns at base / `md` / `lg`, gap `space-md`.

### Recipe card

An 8px `surface-container-low` panel, hovering to `surface-container`:

- Top row: the season and category chips (2px radius, `label-sm`, uppercase).
  The design's bookmark button is **not** built (HR-011).
- Title in `headline-md`, turning `primary` on hover.
- A `body-sm` uppercase meta line: time · servings · difficulty, each part
  omitted when the field is absent.
- The description in `body-md`, `on-surface-variant`.
- Footer: a `Veure recepta →` link in `primary`, `label-lg`, nudging right on
  hover.

### Recipe detail

- A top bar: `← Tornar a les receptes` on the left; on the right one
  `surface-container-low` group holding **Imprimir**, **Compartir** and
  **Editar**, separated by 1px rules, labels hidden below `md`. The design's
  `Preferit` button is **not** built (HR-011). The existing delete action, with
  its confirmation (HR-006), joins this group.
- Header: the classification chips, then the title in `headline-display`, then
  the description as an italic `headline-md` in `secondary`. Then a
  `surface-container-low` stats strip — Temps Prep, Temps Cocció, Comensals
  (in `primary`), Dificultat — each a `label-sm` caption over a `headline-sm`
  value.
- Body: a 12-column grid — a **5-column `aside`, sticky at `top-24`**, and a
  7-column main column.
  - The aside holds Ingredients: `headline-md` heading beside the existing
    servings scaler (`− 4 racions +`), a `body-sm` instruction line, then the
    ingredient list. Each row is a checkbox, the name in `body-md`, and the
    scaled quantity right-aligned in `label-lg` `secondary` with
    `tabular-nums`. Notes follow in their own panel.
  - The main column holds `Elaboració pas a pas` in `headline-lg`, with the step
    count in `label-sm` on the right, then one 4px `surface-container-low` card
    per step: the number in `step-numeral` `primary` (`01`, `02`, …) opposite the
    step's `label-sm` phase line, then the step title in `headline-sm`, then the
    instruction in `body-lg`. Title and duration are both optional — the
    design's `Mise en place · 5 min` line renders only what exists.
- A closing line: `Última modificació: <updatedAt> · Creada per tu`. The date is
  real; `Creada per tu` is **fixed text** until the multi-user grilling gives it
  a real author (HR-012).

### Add / edit form

Both routes keep rendering one `RecipeForm.vue`. The edit route differs only in
its `<h1>` (`Editar Recepta`) and its submit label.

- `<h1>` **`Nova Recepta`** in `headline-display`, with a `headline-md` italic
  lead below it.
- A 12-column section: **7 columns** for primary registration — a `label-md`
  `primary` caption (`01 · Registre Primari`), the title input in
  `headline-sm`, the description textarea, and a 4-up row of small
  `surface-container-lowest` panels for **Comensals** (with `−`/`+` buttons),
  **Preparació** (min), **Cocció** (min) and **Dificultat** (a select).
- **5 columns** for classification: season as a row of 12px pills, category as a
  2-column grid of radio rows using the long Catalan labels already in
  `utils/recipes.ts`.
- A full-width ingredients section: a `label-md` caption
  (`02 · Taula de Pesades i Ingredients`), a heading, then a 12-column table —
  quantity (3), unit (3), ingredient (5), remove (1) — with `sm:hidden` labels
  stacking it on mobile. **The unit field stays a free-text input** capped at 60
  characters (HR-009); it is styled to match the design's select but is not one.
  A `datalist` of common units may be offered as suggestions.
- The steps section follows the same pattern, with the existing title and
  duration fields.
- Draft autosave, validation messages and the "quantity could not be read"
  warning from issue #11 all stay, restyled.

### Copy and language

All user-facing copy stays Catalan. The Catalan labels in `utils/recipes.ts` are
unchanged — including `snack: 'Pica-pica'` in both tables. The design's form
calls that category `Fons · Fermentació`, which is a different concept (stocks
and ferments, not snacks) and contradicts its own filter chips; the existing
label wins.

## Non-functional

- **Accessibility:** both themes keep WCAG AA. The new palette must be
  re-validated — `#6d2409` and `#705a4f` are not the colours issue #6 checked.
  Every interactive element keeps its accessible name and visible focus ring.
  The ingredient check-off is reachable and operable by keyboard.
- **Fonts:** Newsreader and Work Sans replace Playfair Display and Inter in the
  `nuxt.config.ts` Google Fonts link. Every stack keeps a real fallback.
- **Performance:** no new runtime dependency, no icon library — Material Symbols
  is already loaded.
- **Print:** the detail page's `@media print` rules keep working.
- **i18n / SEO:** unchanged.

## Acceptance criteria

- [ ] Every colour, font size, line height, weight, tracking, radius and spacing
      value in `assets/css/main.css` matches the Stitch config values recorded
      above, one for one.
- [ ] Newsreader and Work Sans are loaded and applied; no Playfair Display or
      Inter reference remains in the codebase.
- [ ] No radius in the app is `9999px` or 24px; cards are 8px, the nav is 12px,
      chips and inputs are 4px.
- [ ] The shell renders the fixed top header — wordmark, two-item nav container,
      theme toggle — and the bottom pill appears only below `sm`.
- [ ] The catalogue's `<h1>` reads `Cerca`; `Catàleg d'Índex` appears nowhere.
- [ ] The add page's `<h1>` reads `Nova Recepta`, the edit page's `Editar Recepta`.
- [ ] The detail page renders the 5/7 grid with the ingredients aside sticky at
      `top-24` on `lg` and above.
- [ ] Ingredients can be checked off and unchecked; the state clears on reload
      and is never persisted or sent to the API.
- [ ] No favourite control exists anywhere: no bookmark on cards, no `Preferit`
      button, no nav entry.
- [ ] The ingredient unit input is free text, accepts `un pessic de sal marina`
      (23 chars) and rejects only above 60 characters.
- [ ] No avatar, no folio number, no `Arrossos` chip is rendered.
- [ ] `Última modificació` shows the real `updatedAt`, followed by the fixed text
      `Creada per tu`.
- [ ] Loading, empty, error and paging states still behave exactly as before,
      restyled with the new tokens.
- [ ] Both themes pass WCAG AA at the new palette.
- [ ] `pnpm test`, `pnpm typecheck` and `pnpm lint` pass.

## Decisions taken

- The Stitch design is a visual reference only; where it implies a business
  decision that contradicts an active rule, the rule wins — recorded as
  **HR-014**.
- Favourites stay out (HR-011): no bookmark, no `Preferit`, no nav entry.
- The unit field stays free text (HR-009), styled like the design's select.
- The header avatar is not built (HR-012); the theme toggle takes its place.
- The nav keeps two items, Cerca and Afegir, in the design's header shape.
- Mobile keeps the floating bottom navigation the design omits.
- The dark theme is derived from the new palette rather than dropped.
- `snack` stays `Pica-pica` in both label tables.
- The editorial eyebrows and the page footer are not built.
- `Creada per tu` is fixed text until the multi-user grilling.
- Ingredient check-off is per-session in-memory state, not persisted.
- The edit page derives its layout from the add page.
- Verification is exact token values plus a visual review against the Stitch
  screens, not automated screenshot tests.

## Open questions

None.

## Out of scope / future

- Multi-user, authentication and recipe ownership (HR-012) — needs its own
  grilling. It brings back the avatar, the real author line, and favourites as a
  per-user relation (HR-011).
- Visual-regression testing.
- A folio / recipe number, if the editorial framing is ever wanted as real data.
- The `Inici` and `Favorits` destinations the design's nav shows, if either ever
  gets a screen.
