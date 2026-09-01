<script setup lang="ts">
import type { CreateRecipeInput } from '@receptari/shared';

definePageMeta({ title: 'Nova recepta' });

interface IngredientDraft {
  name: string;
  quantity: number | null;
  unit: string | null;
}

interface StepDraft {
  instruction: string;
}

const title = ref('');
const description = ref<string | null>(null);
const notes = ref<string | null>(null);
const prepTime = ref<number | null>(null);
const cookTime = ref<number | null>(null);
const servings = ref<number | null>(null);

const ingredients = ref<IngredientDraft[]>([{ name: '', quantity: null, unit: null }]);
const steps = ref<StepDraft[]>([{ instruction: '' }]);

const submitting = ref(false);
const error = ref<string | null>(null);

function addIngredient() {
  ingredients.value.push({ name: '', quantity: null, unit: null });
}
function removeIngredient(i: number) {
  ingredients.value.splice(i, 1);
}

function addStep() {
  steps.value.push({ instruction: '' });
}
function removeStep(i: number) {
  steps.value.splice(i, 1);
}
function moveStep(i: number, dir: -1 | 1) {
  const target = i + dir;
  if (target < 0 || target >= steps.value.length) return;
  const item = steps.value[i];
  if (!item) return;
  steps.value.splice(i, 1);
  steps.value.splice(target, 0, item);
}

function buildPayload(): CreateRecipeInput {
  return {
    title: title.value.trim(),
    description: description.value?.trim() || null,
    notes: notes.value?.trim() || null,
    prepTimeMinutes: prepTime.value,
    cookTimeMinutes: cookTime.value,
    servings: servings.value,
    ingredients: ingredients.value
      .filter((i) => i.name.trim().length > 0)
      .map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity,
        unit: i.unit?.trim() || null,
      })),
    steps: steps.value
      .filter((s) => s.instruction.trim().length > 0)
      .map((s) => ({ instruction: s.instruction.trim() })),
  };
}

async function onSubmit() {
  error.value = null;
  if (!title.value.trim()) {
    error.value = 'El títol és obligatori';
    return;
  }
  const payload = buildPayload();
  if (payload.steps.length === 0) {
    error.value = 'Cal com a mínim un pas';
    return;
  }

  submitting.value = true;
  try {
    const created = await useRecipes().create(payload);
    await navigateTo(`/recipes/${created.id}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error creant la recepta';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Nova recepta</h1>

    <form class="form" @submit.prevent="onSubmit">
      <section class="card-section">
        <h2>Informació general</h2>

        <div class="field">
          <label>Títol *</label>
          <InputText v-model="title" placeholder="Ex: Pa amb tomàquet" />
        </div>

        <div class="field">
          <label>Descripció</label>
          <Textarea v-model="description" rows="2" autoResize placeholder="Una línia breu..." />
        </div>

        <div class="grid-3">
          <div class="field">
            <label>Temps prep (min)</label>
            <InputNumber v-model="prepTime" :min="0" :max="9999" />
          </div>
          <div class="field">
            <label>Temps cocció (min)</label>
            <InputNumber v-model="cookTime" :min="0" :max="9999" />
          </div>
          <div class="field">
            <label>Racions</label>
            <InputNumber v-model="servings" :min="1" :max="999" />
          </div>
        </div>
      </section>

      <section class="card-section">
        <div class="section-header">
          <h2>Ingredients</h2>
          <Button label="Afegir" icon="pi pi-plus" size="small" severity="secondary" @click="addIngredient" />
        </div>

        <div v-for="(ing, i) in ingredients" :key="i" class="ingredient-row">
          <InputText v-model="ing.name" placeholder="Nom" class="grow" />
          <InputNumber v-model="ing.quantity" :min="0" placeholder="Quantitat" :max-fraction-digits="3" />
          <InputText v-model="ing.unit" placeholder="Unitat (g, ml, ...)" />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            :disabled="ingredients.length === 1"
            @click="removeIngredient(i)"
          />
        </div>
      </section>

      <section class="card-section">
        <div class="section-header">
          <h2>Passos</h2>
          <Button label="Afegir" icon="pi pi-plus" size="small" severity="secondary" @click="addStep" />
        </div>

        <div v-for="(step, i) in steps" :key="i" class="step-row">
          <span class="step-num">{{ i + 1 }}</span>
          <Textarea v-model="step.instruction" rows="2" autoResize placeholder="Descriu el pas..." class="grow" />
          <div class="step-actions">
            <Button icon="pi pi-arrow-up" text rounded :disabled="i === 0" @click="moveStep(i, -1)" />
            <Button icon="pi pi-arrow-down" text rounded :disabled="i === steps.length - 1" @click="moveStep(i, 1)" />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              :disabled="steps.length === 1"
              @click="removeStep(i)"
            />
          </div>
        </div>
      </section>

      <section class="card-section">
        <h2>Notes</h2>
        <Textarea v-model="notes" rows="3" autoResize placeholder="Variacions, trucs, maridatge..." />
      </section>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <NuxtLink to="/"><Button label="Cancel·lar" severity="secondary" /></NuxtLink>
        <Button type="submit" label="Crear recepta" icon="pi pi-check" :loading="submitting" />
      </div>
    </form>
  </div>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
}

.card-section h2 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.field label {
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: 500;
}

.grid-3 {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, 1fr);
}

.ingredient-row {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 2fr 1fr 1fr auto;
  margin-bottom: 0.5rem;
  align-items: center;
}

.grow {
  width: 100%;
}

.step-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  align-items: start;
}

.step-num {
  background: var(--p-primary-color, #10b981);
  color: #fff;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.step-actions {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.error {
  background: #fee;
  color: #c33;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #fcc;
  margin: 0;
}
</style>
