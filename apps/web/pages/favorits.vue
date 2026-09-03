<script setup lang="ts">
import type { RecipeSummary } from '@receptari/shared';

const recipes = ref<RecipeSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    recipes.value = await useRecipes().listFavorites();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error carregant favorits';
  } finally {
    loading.value = false;
  }
}

await load();

const TONES = ['default', 'sage', 'sand', 'clay'] as const;

async function toggleFavorite(recipe: RecipeSummary) {
  const next = !recipe.isFavorite;
  try {
    await useRecipes().toggleFavorite(recipe.id, next);
    recipe.isFavorite = next;
    if (!next) {
      recipes.value = recipes.value.filter((r) => r.id !== recipe.id);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error actualitzant favorit';
  }
}
</script>

<template>
  <div>
    <header class="page-header">
      <h1 class="display-lg">Els meus Preferits</h1>
      <p class="page-lead">
        La teva col·lecció personalitzada de receptes guardades. Una selecció dels
        plats que més t'estimes, sempre a mà per cuinar en qualsevol moment.
      </p>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading && recipes.length === 0" class="empty">Carregant favorits...</div>

    <div v-else-if="recipes.length === 0" class="empty">
      <p>Encara no has guardat cap favorit.</p>
      <NuxtLink to="/cerca" class="btn-primary">
        <span class="material-symbols-outlined">search</span>
        Descobrir receptes
      </NuxtLink>
    </div>

    <div v-else class="bento-grid">
      <RecipeCard
        v-for="(recipe, i) in recipes"
        :key="recipe.id"
        :recipe="recipe"
        :featured="i === 0"
        :tone="TONES[i % TONES.length]!"
        @toggle-favorite="toggleFavorite"
      />
    </div>
  </div>
</template>

<style scoped>
.bento-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: minmax(300px, auto);
  }

  .bento-grid > :first-child {
    grid-column: span 2;
  }
}

@media (min-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .bento-grid > :first-child {
    grid-column: span 2;
    grid-row: span 2;
  }
}
</style>
