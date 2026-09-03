# Reference

Vocabulary and business definitions for Receptari. Only what is **not obvious**
from the code. Keep entries short. Alphabetical.

> Entries marked *(pending spec 001)* describe the decided vocabulary, which the
> code has not caught up with yet.

## Category, Season, Difficulty *(pending spec 001)*
The three axes a recipe is classified by (HR-007). The database stores stable
internal keys — `breakfast`/`lunch`/`dinner`/`dessert`/`snack`/`bread`,
`spring`/`summer`/`autumn`/`winter`/`all_year`, `easy`/`medium`/`hard` — and the
web app owns the Catalan labels. Category is required; season and difficulty are
optional and their slots are simply hidden when absent. Category carries two
label sets: a short one for filter chips and cards, a longer descriptive one for
the add/edit form.

## Favorite — *removed (pending specs 001 and 002)*
Recipes used to carry a global `isFavorite` boolean, toggled through
`POST /recipes/:id/favorite` and exempt from the full-replace rule. Favourites
are **removed entirely** (HR-011) because a single global boolean is the wrong
shape for the multi-user direction (HR-012): once each registered user saves
their own, a favourite is a `user × recipe` relation, not a field of the recipe.
They return only with the multi-user work, and never as a column on `recipes`.

## Ingredient
A line of a recipe's ingredient list: `name` plus an optional `quantity` and
`unit`. Both are nullable — "sal al gust" is a valid ingredient with no
quantity. `unit` is free text, not a controlled vocabulary, capped at 60
characters (HR-009); a quantity, when present, is greater than zero. Ingredients
are ordered by `position` and have no existence outside their recipe (they
cascade on delete).

## Position
The 0-based ordering index of an ingredient or a step within its recipe. It is
**not supplied by the client**: the API derives it from the order of the array
in the request payload. Callers reorder by reordering the array.

## Recipe (recepta)
The root aggregate: title, description, notes, times, servings, classification,
plus its ingredients and steps. It has **no image** (HR-008). Today there are no
users and no ownership, but that is the current state, not a decision: the app is
headed for multi-user, where every recipe has an author who alone may edit or
delete it (HR-012).

## Receptari
The collection of every recipe in the app. While there is a single implicit
user, "el receptari" and "all recipes" are the same set — that stops being true
once recipes have authors (HR-012). The word is not a domain entity, only the
product name.

## RecipeSummary
The shape returned by the list endpoint: the recipe without its `notes`,
`ingredients` and `steps`, plus a computed `ingredientCount`. Cards and lists
use this; only the detail page fetches the full `Recipe`. It carries no
favourite flag (HR-011). The endpoint returns
`{ items, total }` rather than a bare array, because the catalogue shows both a
page and the unpaged count.

## Step (pas)
One instruction of the method, ordered by `position`, with an optional short
title and an optional duration in minutes (both *pending spec 001*). A recipe
must have at least one step and at least one ingredient (HR-001). Steps cascade
on recipe delete.

## Search text *(pending spec 001)*
A denormalised `recipes.search_text` column holding the recipe's title and all
its ingredient names, lowercased and stripped of diacritics. It exists because
search must be accent-insensitive and PGlite does not ship the `unaccent`
extension. It is rewritten by the application on every create and update; it is
never read by anything but search.


## Tag — *removed*
Recipes used to carry free-text tags in a comma-separated `recipes.tags`
column. Classification is now `category` / `season` / `difficulty` (HR-007) and
tags no longer exist. Do not reintroduce them without superseding HR-007.
