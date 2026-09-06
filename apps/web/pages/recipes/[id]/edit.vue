<script setup lang="ts">
import type { CreateRecipeInput, Recipe } from '@receptari/shared';

definePageMeta({ title: 'Editar recepta' });

const route = useRoute();
const id = computed(() => String(route.params.id));

const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);

const form = ref<{ forgetDraft: () => void } | null>(null);
const submitting = ref(false);
const submitError = ref<string | null>(null);

onMounted(async () => {
  try {
    recipe.value = await useRecipes().get(id.value);
  } catch (err) {
    // A draft left behind for a recipe that no longer exists is dead weight,
    // and must not keep the route from rendering its error state.
    clearDraft(draftKeyFor(id.value), getDraftStorage());
    loadError.value = err instanceof Error ? err.message : 'No s’ha pogut carregar la recepta';
  } finally {
    loading.value = false;
  }
});

async function onSubmit(payload: CreateRecipeInput) {
  submitError.value = null;
  submitting.value = true;
  try {
    // Saving replaces the recipe entirely — the payload is the whole thing.
    await useRecipes().update(id.value, payload);
    form.value?.forgetDraft();
    await navigateTo(`/recipes/${id.value}`);
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Error desant la recepta';
  } finally {
    submitting.value = false;
  }
}

async function onCancel() {
  await navigateTo(`/recipes/${id.value}`);
}
</script>

<template>
  <div class="form-page">
    <header class="form-page-header">
      <h1 class="headline-display">Editar Recepta</h1>
      <p class="form-page-lead">
        Afina el que calgui. En desar, la recepta es guarda sencera amb l’ordre d’ingredients i
        passos que hi ha a la pantalla.
      </p>
    </header>

    <p v-if="loading" class="empty">Carregant la recepta...</p>
    <p v-else-if="loadError" class="error" role="alert">{{ loadError }}</p>

    <RecipeForm
      v-else-if="recipe"
      ref="form"
      :initial="recipe"
      :submitting="submitting"
      :submit-error="submitError"
      submit-label="Desar canvis"
      @submit="onSubmit"
      @cancel="onCancel"
    />
  </div>
</template>
