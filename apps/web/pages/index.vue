<script setup lang="ts">
import type {
  CategoryKey,
  ListRecipesQuery,
  RecipeSummary,
  SeasonKey,
} from '@receptari/shared';

type TimeKey = NonNullable<ListRecipesQuery['time']>;
type SortKey = ListRecipesQuery['sort'];

const TIME_OPTIONS: readonly { key: TimeKey; label: string }[] = [
  { key: 'lt30', label: '< 30 min' },
  { key: '30to60', label: '30-60 min' },
  { key: 'gt60', label: '+1 hora' },
];

const SORT_OPTIONS: readonly { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Més recents' },
  { key: 'alpha', label: 'Alfabètic (A-Z)' },
  { key: 'prep', label: 'Temps de preparació' },
];

const PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 250;

const api = useRecipes();

// Query state. Everything here is sent to the API: the page never filters,
// sorts or counts anything itself, because with paging in play it would only
// ever see the current page and would report the wrong total.
const query = ref('');
const debouncedQuery = ref('');
const activeCategory = ref<CategoryKey | null>(null);
const activeSeason = ref<SeasonKey | null>(null);
const activeTime = ref<TimeKey | null>(null);
const sort = ref<SortKey>('recent');
const offset = ref(0);

const items = ref<RecipeSummary[]>([]);
const total = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref<string | null>(null);

/**
 * Only the newest request may write to the list. An earlier request that
 * resolves late is dropped, so a slow response for a stale filter cannot
 * overwrite the results the user is actually looking at.
 */
let latestRequest = 0;

async function fetchPage(mode: 'replace' | 'append') {
  const token = ++latestRequest;
  if (mode === 'append') loadingMore.value = true;
  else loading.value = true;
  error.value = null;

  try {
    const response = await api.list({
      q: debouncedQuery.value || undefined,
      category: activeCategory.value ?? undefined,
      season: activeSeason.value ?? undefined,
      time: activeTime.value ?? undefined,
      sort: sort.value,
      limit: PAGE_SIZE,
      offset: offset.value,
    });

    if (token !== latestRequest) return;

    items.value = mode === 'append' ? [...items.value, ...response.items] : response.items;
    total.value = response.total;
  } catch (err) {
    if (token !== latestRequest) return;
    // The raw fetch error is English and full of URLs; the reader gets the
    // Catalan sentence and a way to try again.
    console.error(err);
    error.value = 'No s\'han pogut carregar les receptes. Comprova la connexió amb el servidor.';
    if (mode === 'replace') {
      items.value = [];
      total.value = 0;
    }
  } finally {
    if (token === latestRequest) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
}

/** Any change to the query, a chip or the sort restarts paging from the top. */
function reload() {
  offset.value = 0;
  return fetchPage('replace');
}

function loadMore() {
  offset.value += PAGE_SIZE;
  return fetchPage('append');
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value.trim();
  }, SEARCH_DEBOUNCE_MS);
});
onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

watch([debouncedQuery, activeCategory, activeSeason, activeTime, sort], () => {
  void reload();
});

function toggleCategory(key: CategoryKey) {
  activeCategory.value = activeCategory.value === key ? null : key;
}

function toggleSeason(key: SeasonKey) {
  activeSeason.value = activeSeason.value === key ? null : key;
}

function toggleTime(key: TimeKey) {
  activeTime.value = activeTime.value === key ? null : key;
}

const hasFilters = computed(
  () =>
    debouncedQuery.value !== '' ||
    activeCategory.value !== null ||
    activeSeason.value !== null ||
    activeTime.value !== null,
);

const hasMore = computed(() => items.value.length < total.value);

await reload();
</script>

<template>
  <div>
    <section class="page-header">
      <h1 class="headline-display">Cerca</h1>
      <p class="page-lead">
        El receptari sencer, escrit a mà i sense fotografies. Cerca per nom o per
        ingredient, i filtra per categoria, temporada o temps de cuina.
      </p>
    </section>

    <div class="search-box">
      <span class="material-symbols-outlined">search</span>
      <input
        v-model="query"
        type="search"
        class="search-input"
        placeholder="Què vols cuinar avui?"
        aria-label="Cerca receptes"
      />
    </div>

    <div class="filter-panel">
      <div class="filter-row">
        <span id="filter-category" class="filter-label">Per Categoria:</span>
        <div class="chips" role="group" aria-labelledby="filter-category">
          <button
            v-for="option in CATEGORY_OPTIONS"
            :key="option.key"
            type="button"
            class="chip"
            :class="{ 'is-selected': activeCategory === option.key }"
            :aria-pressed="activeCategory === option.key"
            @click="toggleCategory(option.key)"
          >
            {{ option.shortLabel }}
          </button>
        </div>
      </div>

      <div class="filter-row">
        <span id="filter-season" class="filter-label">Per Temporada:</span>
        <div class="chips" role="group" aria-labelledby="filter-season">
          <button
            v-for="option in SEASON_OPTIONS"
            :key="option.key"
            type="button"
            class="chip chip-season"
            :class="{ 'is-selected': activeSeason === option.key }"
            :aria-pressed="activeSeason === option.key"
            @click="toggleSeason(option.key)"
          >
            <span class="material-symbols-outlined">{{ option.icon }}</span>
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="filter-row">
        <span id="filter-time" class="filter-label">Temps:</span>
        <div class="chips" role="group" aria-labelledby="filter-time">
          <button
            v-for="option in TIME_OPTIONS"
            :key="option.key"
            type="button"
            class="chip"
            :class="{ 'is-selected': activeTime === option.key }"
            :aria-pressed="activeTime === option.key"
            @click="toggleTime(option.key)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <section>
      <div class="results-header">
        <h2 class="headline-lg results-title">
          Totes les Receptes
          <span class="results-total">({{ total }})</span>
        </h2>

        <label class="sort-control">
          <span class="sort-label">Ordena per:</span>
          <span class="sort-field">
            <select v-model="sort" class="sort-select">
              <option v-for="option in SORT_OPTIONS" :key="option.key" :value="option.key">
                {{ option.label }}
              </option>
            </select>
            <span class="material-symbols-outlined">expand_more</span>
          </span>
        </label>
      </div>

      <p v-if="error" class="error" role="alert">
        {{ error }}
        <button type="button" class="retry-link" @click="reload()">Torna-ho a provar</button>
      </p>

      <div v-if="loading && items.length === 0" class="empty">
        <p>Carregant receptes...</p>
      </div>

      <div v-else-if="items.length === 0 && !error" class="empty">
        <template v-if="hasFilters">
          <p>Cap recepta coincideix amb aquesta cerca.</p>
          <p>Prova de treure algun filtre o de cercar un altre ingredient.</p>
        </template>
        <template v-else>
          <p>Encara no hi ha cap recepta al receptari.</p>
          <NuxtLink to="/recipes/new" class="btn-primary">
            <span class="material-symbols-outlined">add</span>
            Crear la primera
          </NuxtLink>
        </template>
      </div>

      <template v-else>
        <div class="recipe-grid">
          <RecipeCard v-for="recipe in items" :key="recipe.id" :recipe="recipe" />
        </div>

        <div class="results-footer">
          <p class="results-count">
            Mostrant {{ items.length }} de {{ total }} receptes registrades
          </p>
          <button
            v-if="hasMore"
            type="button"
            class="btn-ghost"
            :disabled="loadingMore"
            @click="loadMore()"
          >
            <span class="material-symbols-outlined">expand_more</span>
            {{ loadingMore ? 'Carregant...' : "Carrega'n més" }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
