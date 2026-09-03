<script setup lang="ts">
import {
  CATEGORY_KEYS,
  type CategoryKey,
  type RecipeSummary,
  type SeasonKey,
} from '@receptari/shared';

// Etiquetes catalanes provisionals: la taula definitiva arriba amb l'especificació 002.
const CATEGORY_LABELS: Record<CategoryKey, string> = {
  breakfast: 'Esmorzars',
  lunch: 'Dinars',
  dinner: 'Sopars',
  dessert: 'Postres',
  snack: 'Berenars',
  bread: 'Pans',
};

const query = ref('');
const activeCategory = ref<CategoryKey | null>(null);
const activeSeason = ref<SeasonKey | null>(null);
const recipes = ref<RecipeSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function search() {
  loading.value = true;
  error.value = null;
  try {
    recipes.value = await useRecipes().search(query.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error cercant receptes';
  } finally {
    loading.value = false;
  }
}

watch(query, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(search, 250);
});

await search();

function toggleCategory(category: CategoryKey) {
  activeCategory.value = activeCategory.value === category ? null : category;
}

function toggleSeason(season: SeasonKey) {
  activeSeason.value = activeSeason.value === season ? null : season;
}

const filtered = computed(() =>
  recipes.value.filter((r) => {
    if (activeCategory.value && r.category !== activeCategory.value) return false;
    if (activeSeason.value && r.season !== activeSeason.value) return false;
    return true;
  }),
);
</script>

<template>
  <div>
    <section class="page-header">
      <h1 class="display-lg">Cerca</h1>
      <div class="search-box">
        <span class="material-symbols-outlined">search</span>
        <input
          v-model="query"
          type="text"
          class="search-input"
          placeholder="Què vols cuinar avui?"
          aria-label="Cerca receptes"
        />
      </div>

      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">Per Categoria</span>
          <div class="chips">
            <button
              v-for="category in CATEGORY_KEYS"
              :key="category"
              type="button"
              class="chip"
              :class="{ 'is-selected': activeCategory === category }"
              @click="toggleCategory(category)"
            >
              {{ CATEGORY_LABELS[category] }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <span class="filter-label">Per Temporada</span>
          <div class="chips">
            <button
              v-for="season in SEASON_OPTIONS"
              :key="season.key"
              type="button"
              class="chip chip-season"
              :class="{ 'is-selected': activeSeason === season.key }"
              @click="toggleSeason(season.key)"
            >
              <span class="material-symbols-outlined">{{ season.icon }}</span>
              {{ season.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section>
      <div class="results-header">
        <h2 class="section-title">Resultats</h2>
        <span class="results-count">{{ filtered.length }} receptes trobades</span>
      </div>

      <div v-if="loading && recipes.length === 0" class="empty">Cercant...</div>

      <div v-else-if="filtered.length === 0" class="empty">
        <p v-if="query || activeCategory || activeSeason">
          Cap recepta coincideix amb la cerca.
        </p>
        <p v-else>Comença a escriure per trobar receptes.</p>
      </div>

      <div v-else class="recipe-grid">
        <RecipeCard
          v-for="recipe in filtered"
          :key="recipe.id"
          :recipe="recipe"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
}
</style>
