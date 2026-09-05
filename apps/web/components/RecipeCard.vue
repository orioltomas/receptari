<script setup lang="ts">
import type { RecipeSummary } from '@receptari/shared';

/**
 * Text-only card: the collection has no photography, so there is no media
 * slot and no placeholder standing in for one. A missing season or difficulty
 * hides its slot instead of rendering an empty chip.
 */
const props = defineProps<{ recipe: RecipeSummary }>();

const categoryLabel = computed(() => categoryShortLabel(props.recipe.category));

const season = computed(() => {
  const key = props.recipe.season;
  return key ? SEASON_OPTIONS.find((option) => option.key === key) ?? null : null;
});

const difficultyText = computed(() => {
  const key = props.recipe.difficulty;
  return key ? difficultyLabel(key) : null;
});

const timeText = computed(() =>
  totalTimeLabel(props.recipe.prepTimeMinutes, props.recipe.cookTimeMinutes),
);
</script>

<template>
  <NuxtLink :to="`/recipes/${recipe.id}`" class="recipe-card">
    <div class="card-body">
      <div class="card-tags">
        <span class="tag">{{ categoryLabel }}</span>
        <span v-if="season" class="tag tone-sage">
          <span class="material-symbols-outlined">{{ season.icon }}</span>
          {{ season.label }}
        </span>
      </div>

      <h3 class="card-title">{{ recipe.title }}</h3>

      <p v-if="recipe.description" class="card-description">{{ recipe.description }}</p>

      <div class="card-meta">
        <span>
          <span class="material-symbols-outlined">schedule</span>
          {{ timeText }}
        </span>
        <span v-if="recipe.servings != null">
          <span class="material-symbols-outlined">group</span>
          {{ recipe.servings }}
        </span>
        <span v-if="difficultyText">
          <span class="material-symbols-outlined">signal_cellular_alt</span>
          {{ difficultyText }}
        </span>
      </div>

      <span class="card-cta">
        Veure recepta
        <span class="material-symbols-outlined">arrow_forward</span>
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card-tags .material-symbols-outlined {
  font-size: 0.9rem;
  margin-right: 0.25rem;
}

.card-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary);
}

.card-cta .material-symbols-outlined {
  font-size: 1rem;
  transition: translate 0.2s ease;
}

.recipe-card:hover .card-cta .material-symbols-outlined {
  translate: 3px 0;
}
</style>
