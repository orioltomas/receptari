<script setup lang="ts">
import type { RecipeSummary } from '@receptari/shared';

const recipes = ref<RecipeSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    recipes.value = await useRecipes().list();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error carregant receptes';
  } finally {
    loading.value = false;
  }
}

await load();

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bon dia';
  if (hour < 20) return 'Bona tarda';
  return 'Bona nit';
});

const seasonKey = currentSeason();

const featured = computed(() => recipes.value[0] ?? null);

const seasonal = computed(() => {
  const bySeason = recipes.value.filter((r) => r.season === seasonKey);
  const pool = bySeason.length > 0 ? bySeason : recipes.value;
  return pool.filter((r) => r.id !== featured.value?.id).slice(0, 4);
});
</script>

<template>
  <div>
    <section class="page-header">
      <h1 class="display-lg">La meva Cuina</h1>
      <p class="page-lead">
        {{ greeting }}. Què et ve de gust cuinar avui? Explora noves receptes de
        temporada.
      </p>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading && recipes.length === 0" class="empty">Carregant receptes...</div>

    <div v-else-if="recipes.length === 0" class="empty">
      <p>Encara no tens cap recepta.</p>
      <NuxtLink to="/recipes/new" class="btn-primary">
        <span class="material-symbols-outlined">add</span>
        Crear la primera
      </NuxtLink>
    </div>

    <template v-else>
      <NuxtLink
        v-if="featured"
        :to="`/recipes/${featured.id}`"
        class="hero-card"
      >
        <div class="hero-watermark">
          <span class="material-symbols-outlined">restaurant_menu</span>
        </div>
        <div class="hero-content">
          <span class="hero-badge">Recepta Destacada</span>
          <h2 class="hero-title">{{ featured.title }}</h2>
          <div class="hero-meta">
            <span>
              <span class="material-symbols-outlined">timer</span>
              {{ totalTimeLabel(featured.prepTimeMinutes, featured.cookTimeMinutes) }}
            </span>
            <span v-if="featured.servings != null">
              <span class="material-symbols-outlined">group</span>
              {{ featured.servings }} comensals
            </span>
          </div>
        </div>
      </NuxtLink>

      <section v-if="seasonal.length > 0" class="home-section">
        <div class="section-header">
          <h2 class="section-title">Receptes de Temporada</h2>
          <NuxtLink to="/cerca" class="section-link">Veure tot</NuxtLink>
        </div>

        <div class="seasonal-grid">
          <RecipeCard
            v-for="recipe in seasonal"
            :key="recipe.id"
            :recipe="recipe"
            compact
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.home-section {
  margin-top: 2.5rem;
}
</style>
