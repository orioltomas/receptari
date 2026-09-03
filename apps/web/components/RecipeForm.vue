<script setup lang="ts">
import type { CreateRecipeInput, Recipe } from '@receptari/shared';

import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  MAX_UNIT_LENGTH,
  SEASON_OPTIONS,
} from '~/utils/recipes';
import {
  MAX_TEXT_LENGTH,
  UNIT_SUGGESTIONS,
  clearDraft,
  draftKeyFor,
  emptyFormState,
  emptyIngredient,
  emptyStep,
  formStateFromRecipe,
  getDraftStorage,
  isFormStateEmpty,
  moveItem,
  readDraft,
  validateForm,
  writeDraft,
  type FormErrors,
  type RecipeFormState,
  type StorageLike,
} from '~/utils/recipe-form';

const props = withDefaults(
  defineProps<{
    /** The recipe being edited. Absent on the add route. */
    initial?: Recipe | null;
    submitting?: boolean;
    /** Whatever the API said when the save failed. */
    submitError?: string | null;
    submitLabel?: string;
  }>(),
  { initial: null, submitting: false, submitError: null, submitLabel: 'Guardar Recepta' },
);

const emit = defineEmits<{
  submit: [payload: CreateRecipeInput];
  cancel: [];
}>();

const draftKey = computed(() => draftKeyFor(props.initial?.id ?? null));

const state = reactive<RecipeFormState>(
  props.initial ? formStateFromRecipe(props.initial) : emptyFormState(),
);

const errors = ref<FormErrors>({ ingredientRows: {}, stepRows: {} });
const summary = ref<string | null>(null);
const draftRestored = ref(false);

let storage: StorageLike | null = null;
/** Autosave stays off until the stored draft has had its chance to load. */
let draftLoaded = false;

function applyState(next: RecipeFormState) {
  Object.assign(state, next);
  state.ingredients = next.ingredients.length ? next.ingredients : [emptyIngredient()];
  state.steps = next.steps.length ? next.steps : [emptyStep()];
}

onMounted(() => {
  storage = getDraftStorage();
  const draft = readDraft(draftKey.value, storage);
  // The draft is newer than the stored recipe by definition: it is work the
  // user did after loading it, so it wins over the hydrated values.
  if (draft && !isFormStateEmpty(draft)) {
    applyState(draft);
    draftRestored.value = true;
  }
  draftLoaded = true;
});

watch(
  () => JSON.stringify(state),
  () => {
    if (!draftLoaded) return;
    if (isFormStateEmpty(state)) {
      clearDraft(draftKey.value, storage);
      return;
    }
    writeDraft(draftKey.value, toRaw(state), storage);
  },
);

/** Called by the route once the API has accepted the save. */
function forgetDraft() {
  clearDraft(draftKey.value, storage);
  draftRestored.value = false;
}

defineExpose({ forgetDraft });

const descriptionLength = computed(() => state.description.trim().length);
const notesLength = computed(() => state.notes.trim().length);

function addIngredient() {
  state.ingredients.push(emptyIngredient());
}
function removeIngredient(index: number) {
  // The last row stays: a recipe always has at least one ingredient.
  if (state.ingredients.length === 1) return;
  state.ingredients.splice(index, 1);
  errors.value.ingredientRows = {};
}

function addStep() {
  state.steps.push(emptyStep());
}
function removeStep(index: number) {
  // Same reason as the ingredients: a recipe always has at least one step.
  if (state.steps.length === 1) return;
  state.steps.splice(index, 1);
  errors.value.stepRows = {};
}
function moveStep(index: number, direction: -1 | 1) {
  // Reordering the array *is* the reorder — the API derives position from it.
  if (moveItem(state.steps, index, direction)) errors.value.stepRows = {};
}

function onSubmit() {
  const result = validateForm(toRaw(state));
  if (!result.ok) {
    // The save button stays enabled: the error explains why nothing happened,
    // and a disabled control would hide the reason.
    errors.value = result.errors;
    summary.value = result.summary;
    return;
  }
  errors.value = { ingredientRows: {}, stepRows: {} };
  summary.value = null;
  emit('submit', result.payload);
}

function onCancel() {
  forgetDraft();
  emit('cancel');
}
</script>

<template>
  <form novalidate @submit.prevent="onSubmit">
    <p v-if="draftRestored" class="draft-note" role="status">
      <span class="material-symbols-outlined">history</span>
      S’ha recuperat un esborrany desat en aquest navegador.
    </p>

    <!-- 01 · Informació bàsica -->
    <section class="form-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="material-symbols-outlined">edit_note</span>
          Informació bàsica
        </h2>
      </div>

      <div class="field" style="margin-bottom: 1rem">
        <label class="field-label" for="recipe-title">Títol de la recepta</label>
        <input
          id="recipe-title"
          v-model="state.title"
          type="text"
          class="input input--lg"
          maxlength="200"
          placeholder="Ex: Risotto de bolets de temporada"
          :aria-invalid="Boolean(errors.title)"
        />
        <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
      </div>

      <div class="field" style="margin-bottom: 1rem">
        <label class="field-label" for="recipe-description">Descripció</label>
        <textarea
          id="recipe-description"
          v-model="state.description"
          class="textarea"
          rows="2"
          placeholder="Una línia breu que resumeixi la recepta..."
          :aria-invalid="Boolean(errors.description)"
        />
        <span class="field-hint" :class="{ 'is-over': descriptionLength > MAX_TEXT_LENGTH }">
          {{ descriptionLength }} / {{ MAX_TEXT_LENGTH }} caràcters
        </span>
        <p v-if="errors.description" class="field-error">{{ errors.description }}</p>
      </div>

      <div class="field" style="margin-bottom: 1rem">
        <label class="field-label" for="recipe-category">Categoria</label>
        <div class="option-grid">
          <button
            v-for="option in CATEGORY_OPTIONS"
            :key="option.key"
            type="button"
            class="option-chip"
            :class="{ 'is-selected': state.category === option.key }"
            :aria-pressed="state.category === option.key"
            @click="state.category = option.key"
          >
            {{ option.longLabel }}
          </button>
        </div>
        <span class="field-hint">Obligatori</span>
        <p v-if="errors.category" class="field-error">{{ errors.category }}</p>
      </div>

      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="servings">Comensals</label>
          <div class="icon-field">
            <span class="material-symbols-outlined">group</span>
            <input
              id="servings"
              v-model="state.servingsText"
              type="number"
              class="input"
              min="1"
              max="999"
              placeholder="4 persones"
            />
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="prep-time">Temps de preparació (min)</label>
          <div class="icon-field">
            <span class="material-symbols-outlined">schedule</span>
            <input
              id="prep-time"
              v-model="state.prepTimeText"
              type="number"
              class="input"
              min="0"
              max="9999"
              placeholder="30"
            />
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="cook-time">Temps de cocció (min)</label>
          <div class="icon-field">
            <span class="material-symbols-outlined">local_fire_department</span>
            <input
              id="cook-time"
              v-model="state.cookTimeText"
              type="number"
              class="input"
              min="0"
              max="9999"
              placeholder="45"
            />
          </div>
        </div>
      </div>

      <div class="field" style="margin-top: 1rem">
        <span class="field-label">Dificultat</span>
        <div class="option-grid">
          <button
            v-for="option in DIFFICULTY_OPTIONS"
            :key="option.key"
            type="button"
            class="option-chip"
            :class="{ 'is-selected': state.difficulty === option.key }"
            :aria-pressed="state.difficulty === option.key"
            @click="state.difficulty = state.difficulty === option.key ? null : option.key"
          >
            {{ option.label }}
          </button>
        </div>
        <span class="field-hint">Opcional</span>
      </div>
    </section>

    <!-- Temporada -->
    <section class="form-section">
      <div class="section-header">
        <h2 class="section-title">Temporada ideal</h2>
      </div>
      <div class="season-grid">
        <button
          v-for="option in SEASON_OPTIONS"
          :key="option.key"
          type="button"
          class="season-option"
          :class="[`tone-${option.tone}`, { 'is-selected': state.season === option.key }]"
          :aria-pressed="state.season === option.key"
          @click="state.season = state.season === option.key ? null : option.key"
        >
          <span class="material-symbols-outlined">{{ option.icon }}</span>
          <span>{{ option.label }}</span>
        </button>
      </div>
      <span class="field-hint">Opcional</span>
    </section>

    <!-- 02 · Ingredients -->
    <section class="form-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="material-symbols-outlined">kitchen</span>
          Ingredients
        </h2>
      </div>

      <datalist id="unit-suggestions">
        <option v-for="unit in UNIT_SUGGESTIONS" :key="unit" :value="unit" />
      </datalist>

      <div v-for="(ing, i) in state.ingredients" :key="i" class="ingredient-block">
        <div class="ingredient-row">
          <input
            v-model="ing.quantityText"
            type="text"
            class="input ingredient-qty"
            placeholder="Quantitat (ex: 200)"
            :aria-label="`Quantitat de l'ingredient ${i + 1}`"
            :aria-invalid="Boolean(errors.ingredientRows[i])"
          />
          <!-- Open suggestion list: any free text up to the stored cap is fine. -->
          <input
            v-model="ing.unitText"
            type="text"
            class="input ingredient-unit"
            list="unit-suggestions"
            :maxlength="MAX_UNIT_LENGTH + 1"
            placeholder="Unitat (ex: g)"
            :aria-label="`Unitat de l'ingredient ${i + 1}`"
            :aria-invalid="Boolean(errors.ingredientRows[i])"
          />
          <input
            v-model="ing.name"
            type="text"
            class="input ingredient-name"
            maxlength="200"
            placeholder="Ingredient (ex: Arròs Arborio)"
            :aria-label="`Nom de l'ingredient ${i + 1}`"
            :aria-invalid="Boolean(errors.ingredientRows[i])"
          />
          <button
            type="button"
            class="icon-btn icon-btn-danger"
            :disabled="state.ingredients.length === 1"
            :aria-label="`Eliminar ingredient ${i + 1}`"
            @click="removeIngredient(i)"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <p v-if="errors.ingredientRows[i]" class="field-error">
          {{ errors.ingredientRows[i] }}
        </p>
      </div>

      <p v-if="errors.ingredients" class="field-error">{{ errors.ingredients }}</p>

      <button type="button" class="add-row-btn" @click="addIngredient">
        <span class="material-symbols-outlined">add</span>
        Afegir Ingredient
      </button>
    </section>

    <!-- 03 · Passos -->
    <section class="form-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="material-symbols-outlined">menu_book</span>
          Pas a pas
        </h2>
        <button type="button" class="add-row-btn" @click="addStep">
          <span class="material-symbols-outlined">add</span>
          Afegir pas
        </button>
      </div>

      <div v-for="(step, i) in state.steps" :key="i" class="step-block">
        <div class="step-row">
          <span class="step-num">{{ i + 1 }}</span>
          <div class="step-fields">
            <div class="step-head">
              <input
                v-model="step.title"
                type="text"
                class="input"
                maxlength="120"
                placeholder="Títol del pas (opcional)"
                :aria-label="`Títol del pas ${i + 1}`"
              />
              <input
                v-model="step.durationText"
                type="number"
                class="input step-duration"
                min="0"
                max="9999"
                placeholder="Min."
                :aria-label="`Durada del pas ${i + 1} en minuts`"
              />
            </div>
            <textarea
              v-model="step.instruction"
              class="textarea"
              rows="2"
              placeholder="Descriu el pas..."
              :aria-label="`Instrucció del pas ${i + 1}`"
              :aria-invalid="Boolean(errors.stepRows[i])"
            />
          </div>
          <div class="step-actions">
            <button
              type="button"
              class="icon-btn"
              :disabled="i === 0"
              aria-label="Moure amunt"
              @click="moveStep(i, -1)"
            >
              <span class="material-symbols-outlined">arrow_upward</span>
            </button>
            <button
              type="button"
              class="icon-btn"
              :disabled="i === state.steps.length - 1"
              aria-label="Moure avall"
              @click="moveStep(i, 1)"
            >
              <span class="material-symbols-outlined">arrow_downward</span>
            </button>
            <button
              type="button"
              class="icon-btn icon-btn-danger"
              :disabled="state.steps.length === 1"
              :aria-label="`Eliminar pas ${i + 1}`"
              @click="removeStep(i)"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <p v-if="errors.stepRows[i]" class="field-error">{{ errors.stepRows[i] }}</p>
      </div>

      <p v-if="errors.steps" class="field-error">{{ errors.steps }}</p>
    </section>

    <!-- Notes -->
    <section class="form-section">
      <div class="section-header">
        <h2 class="section-title">Notes addicionals</h2>
      </div>
      <div class="field">
        <label class="field-label" for="recipe-notes">Notes</label>
        <textarea
          id="recipe-notes"
          v-model="state.notes"
          class="textarea"
          rows="4"
          placeholder="Suggeriments de maridatge, possibles substitucions d'ingredients, o consells personals..."
          :aria-invalid="Boolean(errors.notes)"
        />
        <span class="field-hint" :class="{ 'is-over': notesLength > MAX_TEXT_LENGTH }">
          {{ notesLength }} / {{ MAX_TEXT_LENGTH }} caràcters
        </span>
        <p v-if="errors.notes" class="field-error">{{ errors.notes }}</p>
      </div>
    </section>

    <p v-if="summary" class="error" role="alert">{{ summary }}</p>
    <p v-if="submitError" class="error" role="alert">{{ submitError }}</p>

    <div class="actions-row">
      <button type="button" class="btn-ghost" @click="onCancel">Cancel·lar</button>
      <button type="submit" class="btn-primary" :disabled="submitting">
        <span class="material-symbols-outlined">save</span>
        {{ submitting ? 'Guardant...' : submitLabel }}
      </button>
    </div>

    <p class="draft-footer">
      <span class="material-symbols-outlined">cloud_done</span>
      Desat local automàtic actiu
    </p>
  </form>
</template>

<style scoped>
.field-error {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--error, #b3261e);
}

.field-hint.is-over {
  color: var(--error, #b3261e);
  font-weight: 600;
}

.option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.option-chip {
  border: 1px solid var(--outline);
  background: var(--surface-container-low);
  color: var(--on-surface);
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.option-chip.is-selected {
  background: var(--primary);
  color: var(--on-primary);
  border-color: var(--primary);
}

.ingredient-block + .ingredient-block {
  margin-top: 0.25rem;
}

.ingredient-row {
  display: grid;
  grid-template-columns: 6rem 8rem 1fr auto;
  gap: 0.5rem;
  align-items: center;
}

.step-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.step-head {
  display: grid;
  grid-template-columns: 1fr 6rem;
  gap: 0.5rem;
}

.draft-note,
.draft-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--on-surface-variant);
}

.draft-note .material-symbols-outlined,
.draft-footer .material-symbols-outlined {
  font-size: 1.1rem;
}

@media (max-width: 640px) {
  .ingredient-row,
  .step-head {
    grid-template-columns: 1fr;
  }
}
</style>
