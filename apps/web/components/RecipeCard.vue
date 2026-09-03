<script setup lang="ts">
import type { CategoryKey, RecipeSummary } from '@receptari/shared';

const props = withDefaults(
  defineProps<{
    recipe: RecipeSummary;
    featured?: boolean;
    compact?: boolean;
    tone?: 'default' | 'sage' | 'sand' | 'clay';
  }>(),
  { featured: false, compact: false, tone: 'default' },
);

const CATEGORY_ICONS: Record<CategoryKey, string> = {
  breakfast: 'breakfast_dining',
  lunch: 'lunch_dining',
  dinner: 'dinner_dining',
  dessert: 'cake',
  snack: 'nutrition',
  bread: 'bakery_dining',
};
const mediaIcon = computed(() => CATEGORY_ICONS[props.recipe.category]);
</script>

<template>
  <NuxtLink
    :to="`/recipes/${recipe.id}`"
    class="recipe-card"
    :class="{ featured, compact }"
  >
    <div class="card-media" :class="`tone-${tone}`">
      <span class="material-symbols-outlined">{{ mediaIcon }}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ recipe.title }}</h3>
      <p v-if="featured && recipe.description" class="card-description">
        {{ recipe.description }}
      </p>
      <div class="card-meta">
        <span>
          <span class="material-symbols-outlined">schedule</span>
          {{ totalTimeLabel(recipe.prepTimeMinutes, recipe.cookTimeMinutes) }}
        </span>
        <span v-if="recipe.servings != null">
          <span class="material-symbols-outlined">group</span>
          {{ recipe.servings }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
