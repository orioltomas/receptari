<script setup lang="ts">
import type { RecipeSummary } from '@receptari/shared';

const props = withDefaults(
  defineProps<{
    recipe: RecipeSummary;
    featured?: boolean;
    compact?: boolean;
    tone?: 'default' | 'sage' | 'sand' | 'clay';
  }>(),
  { featured: false, compact: false, tone: 'default' },
);

const emit = defineEmits<{
  (e: 'toggle-favorite', recipe: RecipeSummary): void;
}>();

const TAG_ICONS: Record<string, string> = {
  tardor: 'energy_savings_leaf',
  primavera: 'local_florist',
  estiu: 'sunny',
  hivern: 'ac_unit',
  sopa: 'soup_kitchen',
  crema: 'soup_kitchen',
  forn: 'bakery_dining',
  pa: 'bakery_dining',
  pasta: 'ramen_dining',
  arròs: 'ramen_dining',
  arros: 'ramen_dining',
  verdura: 'eco',
  verdures: 'eco',
  vegà: 'eco',
  vegan: 'eco',
  ecològic: 'eco',
  dolç: 'cake',
  postres: 'cake',
  esmorzar: 'breakfast_dining',
  dinar: 'lunch_dining',
  sopar: 'dinner_dining',
};

const ICON_POOL = [
  'ramen_dining',
  'eco',
  'soup_kitchen',
  'bakery_dining',
  'nutrition',
  'lunch_dining',
  'cake',
  'breakfast_dining',
] as const;

const mediaIcon = computed(() => {
  for (const tag of props.recipe.tags) {
    const hit = TAG_ICONS[tag.trim().toLowerCase()];
    if (hit) return hit;
  }
  const hash = [...props.recipe.title].reduce(
    (acc, ch) => (acc * 31 + (ch.codePointAt(0) ?? 0)) | 0,
    0,
  );
  return ICON_POOL[Math.abs(hash) % ICON_POOL.length]!;
});
</script>

<template>
  <NuxtLink
    :to="`/recipes/${recipe.id}`"
    class="recipe-card"
    :class="{ featured, compact }"
  >
    <div class="card-media" :class="`tone-${tone}`">
      <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.title" />
      <span v-else class="material-symbols-outlined">{{ mediaIcon }}</span>
      <button
        type="button"
        class="card-favorite"
        :class="{ 'is-favorite': recipe.isFavorite }"
        :aria-label="recipe.isFavorite ? 'Treure de favorits' : 'Afegir a favorits'"
        @click.prevent.stop="emit('toggle-favorite', recipe)"
      >
        <span class="material-symbols-outlined" :class="{ 'ms-fill': recipe.isFavorite }">
          favorite
        </span>
      </button>
    </div>
    <div class="card-body">
      <div v-if="!compact && recipe.tags.length" class="card-tags">
        <span
          v-for="(tag, ti) in recipe.tags.slice(0, 2)"
          :key="tag"
          class="tag"
          :class="{ 'tone-sage': ti === 0 }"
        >
          {{ tag }}
        </span>
      </div>
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
