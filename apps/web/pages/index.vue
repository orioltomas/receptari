<script setup lang="ts">
import type { RecipeSummary } from '@receptari/shared';

const search = ref('');
const recipes = ref<RecipeSummary[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function load() {
  loading.value = true;
  error.value = null;
  try {
    recipes.value = await useRecipes().list({ q: search.value || undefined });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error carregant receptes';
  } finally {
    loading.value = false;
  }
}

watch(search, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(load, 250);
});

await load();

function totalTime(r: RecipeSummary): string {
  const total = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0);
  if (!total) return '—';
  return `${total} min`;
}
</script>

<template>
  <div>
    <h1 class="page-title">Les meves receptes</h1>

    <div class="toolbar">
      <span class="p-input-icon-left search">
        <i class="pi pi-search" />
        <InputText v-model="search" placeholder="Cerca per títol..." />
      </span>
      <Button label="Actualitzar" icon="pi pi-refresh" severity="secondary" @click="load" />
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading && recipes.length === 0" class="empty">Carregant...</div>

    <div v-else-if="recipes.length === 0" class="empty">
      <p>Encara no tens cap recepta.</p>
      <NuxtLink to="/recipes/new">
        <Button label="Crear la primera" icon="pi pi-plus" />
      </NuxtLink>
    </div>

    <div v-else class="grid">
      <NuxtLink
        v-for="recipe in recipes"
        :key="recipe.id"
        :to="`/recipes/${recipe.id}`"
        class="card-link"
      >
        <article class="card">
          <h3>{{ recipe.title }}</h3>
          <p v-if="recipe.description" class="muted">{{ recipe.description }}</p>
          <div class="meta">
            <span><i class="pi pi-clock" /> {{ totalTime(recipe) }}</span>
            <span v-if="recipe.servings"><i class="pi pi-users" /> {{ recipe.servings }} racions</span>
            <span><i class="pi pi-shopping-bag" /> {{ recipe.ingredientCount }} ingredients</span>
          </div>
        </article>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.search :deep(input) {
  min-width: 280px;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.card-link {
  text-decoration: none;
  color: inherit;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem;
  transition: transform 0.1s, box-shadow 0.1s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
}

.muted {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0 0 1rem;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.meta i {
  margin-right: 0.25rem;
}

.error {
  background: #fee;
  color: #c33;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #fcc;
  margin-bottom: 1rem;
}
</style>
