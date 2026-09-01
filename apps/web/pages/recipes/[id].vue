<script setup lang="ts">
import type { Recipe, UpdateRecipeInput } from '@receptari/shared';

const route = useRoute();
const id = computed(() => String(route.params.id));

const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const editing = ref(false);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    recipe.value = await useRecipes().get(id.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error carregant la recepta';
  } finally {
    loading.value = false;
  }
}

await load();

const editTitle = ref('');
const editDescription = ref<string | null>(null);
const editNotes = ref<string | null>(null);
const editPrep = ref<number | null>(null);
const editCook = ref<number | null>(null);
const editServings = ref<number | null>(null);

interface IngredientDraft {
  name: string;
  quantity: number | null;
  unit: string | null;
}
interface StepDraft {
  instruction: string;
}
const editIngredients = ref<IngredientDraft[]>([]);
const editSteps = ref<StepDraft[]>([]);

watch(recipe, (r) => {
  if (!r) return;
  editTitle.value = r.title;
  editDescription.value = r.description;
  editNotes.value = r.notes;
  editPrep.value = r.prepTimeMinutes;
  editCook.value = r.cookTimeMinutes;
  editServings.value = r.servings;
  editIngredients.value =
    r.ingredients.length > 0
      ? r.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit }))
      : [{ name: '', quantity: null, unit: null }];
  editSteps.value =
    r.steps.length > 0
      ? r.steps.map((s) => ({ instruction: s.instruction }))
      : [{ instruction: '' }];
}, { immediate: true });

function startEdit() {
  editing.value = true;
}
function cancelEdit() {
  editing.value = false;
  if (recipe.value) {
    watch(
      recipe,
      (r) => {
        if (!r) return;
        editTitle.value = r.title;
        editDescription.value = r.description;
        editNotes.value = r.notes;
        editPrep.value = r.prepTimeMinutes;
        editCook.value = r.cookTimeMinutes;
        editServings.value = r.servings;
        editIngredients.value =
          r.ingredients.length > 0
            ? r.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit }))
            : [{ name: '', quantity: null, unit: null }];
        editSteps.value =
          r.steps.length > 0
            ? r.steps.map((s) => ({ instruction: s.instruction }))
            : [{ instruction: '' }];
      },
      { once: true },
    );
  }
}

function addIngredient() {
  editIngredients.value.push({ name: '', quantity: null, unit: null });
}
function removeIngredient(i: number) {
  editIngredients.value.splice(i, 1);
}
function addStep() {
  editSteps.value.push({ instruction: '' });
}
function removeStep(i: number) {
  editSteps.value.splice(i, 1);
}
function moveStep(i: number, dir: -1 | 1) {
  const target = i + dir;
  if (target < 0 || target >= editSteps.value.length) return;
  const item = editSteps.value[i];
  if (!item) return;
  editSteps.value.splice(i, 1);
  editSteps.value.splice(target, 0, item);
}

async function saveEdit() {
  if (!recipe.value) return;
  if (!editTitle.value.trim()) {
    error.value = 'El títol és obligatori';
    return;
  }
  const payload: UpdateRecipeInput = {
    title: editTitle.value.trim(),
    description: editDescription.value?.trim() || null,
    notes: editNotes.value?.trim() || null,
    prepTimeMinutes: editPrep.value,
    cookTimeMinutes: editCook.value,
    servings: editServings.value,
    ingredients: editIngredients.value
      .filter((i) => i.name.trim().length > 0)
      .map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity,
        unit: i.unit?.trim() || null,
      })),
    steps: editSteps.value
      .filter((s) => s.instruction.trim().length > 0)
      .map((s) => ({ instruction: s.instruction.trim() })),
  };
  if (payload.steps.length === 0) {
    error.value = 'Cal com a mínim un pas';
    return;
  }

  saving.value = true;
  error.value = null;
  try {
    recipe.value = await useRecipes().update(recipe.value.id, payload);
    editing.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error desant la recepta';
  } finally {
    saving.value = false;
  }
}

async function deleteRecipe() {
  if (!recipe.value) return;
  if (!confirm('Segur que vols esborrar aquesta recepta?')) return;
  try {
    await useRecipes().remove(recipe.value.id);
    await navigateTo('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error esborrant la recepta';
  }
}

function formatIngredient(ing: { name: string; quantity: number | null; unit: string | null }): string {
  const parts: string[] = [];
  if (ing.quantity != null) parts.push(String(ing.quantity));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(' ');
}

function totalMinutes(r: Recipe): number | null {
  const t = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0);
  return t > 0 ? t : null;
}
</script>

<template>
  <div>
    <div v-if="loading" class="empty">Carregant...</div>

    <div v-else-if="error && !recipe">
      <p class="error">{{ error }}</p>
      <NuxtLink to="/"><Button label="Tornar" /></NuxtLink>
    </div>

    <template v-else-if="recipe">
      <div class="header">
        <div>
          <NuxtLink to="/" class="back-link">
            <i class="pi pi-arrow-left" /> Tornar
          </NuxtLink>
          <h1 class="page-title">{{ recipe.title }}</h1>
          <div v-if="!editing" class="meta">
            <span v-if="totalMinutes(recipe)"><i class="pi pi-clock" /> {{ totalMinutes(recipe) }} min</span>
            <span v-if="recipe.servings"><i class="pi pi-users" /> {{ recipe.servings }} racions</span>
            <span>{{ recipe.ingredients.length }} ingredients · {{ recipe.steps.length }} passos</span>
          </div>
        </div>
        <div v-if="!editing" class="actions">
          <Button label="Editar" icon="pi pi-pencil" @click="startEdit" />
          <Button label="Esborrar" icon="pi pi-trash" severity="danger" @click="deleteRecipe" />
        </div>
      </div>

      <div v-if="!editing">
        <p v-if="recipe.description" class="lead">{{ recipe.description }}</p>

        <section class="card-section">
          <h2>Ingredients</h2>
          <ul class="ingredients">
            <li v-for="ing in recipe.ingredients" :key="ing.id">
              {{ formatIngredient(ing) }}
            </li>
          </ul>
        </section>

        <section class="card-section">
          <h2>Passos</h2>
          <ol class="steps">
            <li v-for="step in recipe.steps" :key="step.id">{{ step.instruction }}</li>
          </ol>
        </section>

        <section v-if="recipe.notes" class="card-section">
          <h2>Notes</h2>
          <p class="notes">{{ recipe.notes }}</p>
        </section>
      </div>

      <form v-else class="form" @submit.prevent="saveEdit">
        <section class="card-section">
          <h2>Informació general</h2>
          <div class="field">
            <label>Títol</label>
            <InputText v-model="editTitle" />
          </div>
          <div class="field">
            <label>Descripció</label>
            <Textarea v-model="editDescription" rows="2" autoResize />
          </div>
          <div class="grid-3">
            <div class="field">
              <label>Prep (min)</label>
              <InputNumber v-model="editPrep" :min="0" :max="9999" />
            </div>
            <div class="field">
              <label>Cocció (min)</label>
              <InputNumber v-model="editCook" :min="0" :max="9999" />
            </div>
            <div class="field">
              <label>Racions</label>
              <InputNumber v-model="editServings" :min="1" :max="999" />
            </div>
          </div>
        </section>

        <section class="card-section">
          <div class="section-header">
            <h2>Ingredients</h2>
            <Button label="Afegir" icon="pi pi-plus" size="small" severity="secondary" @click="addIngredient" />
          </div>
          <div v-for="(ing, i) in editIngredients" :key="i" class="ingredient-row">
            <InputText v-model="ing.name" class="grow" />
            <InputNumber v-model="ing.quantity" :min="0" :max-fraction-digits="3" />
            <InputText v-model="ing.unit" />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              :disabled="editIngredients.length === 1"
              @click="removeIngredient(i)"
            />
          </div>
        </section>

        <section class="card-section">
          <div class="section-header">
            <h2>Passos</h2>
            <Button label="Afegir" icon="pi pi-plus" size="small" severity="secondary" @click="addStep" />
          </div>
          <div v-for="(step, i) in editSteps" :key="i" class="step-row">
            <span class="step-num">{{ i + 1 }}</span>
            <Textarea v-model="step.instruction" rows="2" autoResize class="grow" />
            <div class="step-actions">
              <Button icon="pi pi-arrow-up" text rounded :disabled="i === 0" @click="moveStep(i, -1)" />
              <Button icon="pi pi-arrow-down" text rounded :disabled="i === editSteps.length - 1" @click="moveStep(i, 1)" />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                :disabled="editSteps.length === 1"
                @click="removeStep(i)"
              />
            </div>
          </div>
        </section>

        <section class="card-section">
          <h2>Notes</h2>
          <Textarea v-model="editNotes" rows="3" autoResize />
        </section>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="actions">
          <Button label="Cancel·lar" severity="secondary" @click="cancelEdit" />
          <Button type="submit" label="Desar canvis" icon="pi pi-check" :loading="saving" />
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
  color: var(--muted);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.back-link:hover {
  color: var(--text);
}

.meta {
  display: flex;
  gap: 1.25rem;
  color: var(--muted);
  font-size: 0.875rem;
  flex-wrap: wrap;
}

.meta i {
  margin-right: 0.25rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.lead {
  font-size: 1.05rem;
  color: var(--muted);
  margin: 0 0 1.5rem;
}

.card-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
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

.ingredients {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ingredients li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.ingredients li:last-child {
  border-bottom: none;
}

.steps {
  padding-left: 1.5rem;
  margin: 0;
}

.steps li {
  padding: 0.5rem 0;
  line-height: 1.6;
}

.notes {
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.6;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.error {
  background: #fee;
  color: #c33;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #fcc;
  margin: 0;
}
</style>
