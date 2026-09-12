<script setup lang="ts">
import type { RecipeSummary } from '@receptari/shared';

/**
 * Text-only card: the collection has no photography, so there is no media
 * slot and no placeholder standing in for one. There is no bookmark control
 * either, and no space is reserved for one. A missing season, time, servings
 * count or difficulty drops its part instead of rendering an empty one.
 */
const props = defineProps<{ recipe: RecipeSummary }>();

const categoryLabel = computed(() => categoryShortLabel(props.recipe.category));

const seasonText = computed(() => {
  const key = props.recipe.season;
  return key ? seasonLabel(key) : null;
});

/**
 * Total time · servings · difficulty. Each part is present only when its
 * field is, so a recipe with no times and no difficulty shows nothing here
 * rather than an em dash between separators.
 */
const metaLine = computed(() => {
  const { prepTimeMinutes, cookTimeMinutes, servings, difficulty } = props.recipe;
  const parts: string[] = [];

  const totalMinutes = (prepTimeMinutes ?? 0) + (cookTimeMinutes ?? 0);
  if (totalMinutes > 0) parts.push(totalTimeLabel(prepTimeMinutes, cookTimeMinutes));
  if (servings != null) parts.push(servings === 1 ? '1 ració' : `${servings} racions`);
  if (difficulty) parts.push(difficultyLabel(difficulty));

  return parts.join(' · ');
});
</script>

<template>
  <NuxtLink :to="`/recipes/${recipe.id}`" class="recipe-card">
    <div class="card-tags">
      <span v-if="seasonText" class="tag">{{ seasonText }}</span>
      <span class="tag">{{ categoryLabel }}</span>
    </div>

    <h3 class="card-title">{{ recipe.title }}</h3>

    <p v-if="metaLine" class="card-meta">{{ metaLine }}</p>

    <p v-if="recipe.description" class="card-description">{{ recipe.description }}</p>

    <span class="card-cta">
      Veure recepta
      <span class="material-symbols-outlined">arrow_forward</span>
    </span>
  </NuxtLink>
</template>
