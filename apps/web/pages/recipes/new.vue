<script setup lang="ts">
import type { CreateRecipeInput } from '@receptari/shared';

definePageMeta({ title: 'Nova recepta' });

const form = ref<{ forgetDraft: () => void } | null>(null);
const submitting = ref(false);
const submitError = ref<string | null>(null);

async function onSubmit(payload: CreateRecipeInput) {
  submitError.value = null;
  submitting.value = true;
  try {
    const created = await useRecipes().create(payload);
    form.value?.forgetDraft();
    await navigateTo(`/recipes/${created.id}`);
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Error creant la recepta';
  } finally {
    submitting.value = false;
  }
}

async function onCancel() {
  await navigateTo('/');
}
</script>

<template>
  <div class="form-page">
    <header class="page-header">
      <h1 class="display-lg">Nova Recepta</h1>
      <p class="page-lead">
        Comparteix la teva última creació culinària. Afegeix els detalls perquè
        quedi registrada amb la màxima precisió.
      </p>
    </header>

    <RecipeForm
      ref="form"
      :submitting="submitting"
      :submit-error="submitError"
      submit-label="Guardar Recepta"
      @submit="onSubmit"
      @cancel="onCancel"
    />
  </div>
</template>
