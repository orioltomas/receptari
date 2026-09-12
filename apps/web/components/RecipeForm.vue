<script setup lang="ts">
import type { CreateRecipeInput, DifficultyKey, Recipe } from '@receptari/shared';

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

/**
 * The select needs a string; the payload wants `null` for "not stated".
 * Difficulty stays optional, so the empty option is a real choice.
 */
const difficultyValue = computed<string>({
  get: () => state.difficulty ?? '',
  set: (value) => {
    state.difficulty = value ? (value as DifficultyKey) : null;
  },
});

/**
 * The stepper never empties the field — clearing servings is done by typing,
 * which keeps the value optional without a second control.
 */
function adjustServings(delta: number) {
  const current = Number(state.servingsText.trim());
  const base = Number.isFinite(current) && current > 0 ? current : 0;
  state.servingsText = String(Math.min(999, Math.max(1, base + delta)));
}

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
  <form class="recipe-form" novalidate @submit.prevent="onSubmit">
    <p v-if="draftRestored" class="draft-note" role="status">
      <span class="material-symbols-outlined">history</span>
      S’ha recuperat un esborrany desat en aquest navegador.
    </p>

    <!-- 7 columns of primary registration beside 5 of classification. -->
    <section class="form-columns">
      <!-- 01 · Registre primari -->
      <div class="form-panel form-col-primary">
        <div class="form-panel-head">
          <span class="form-panel-caption">01 · Registre Primari</span>
          <span class="form-panel-aside">Camp obligatori *</span>
        </div>

        <div class="field">
          <label class="field-label" for="recipe-title">Títol de la recepta *</label>
          <input
            id="recipe-title"
            v-model="state.title"
            type="text"
            class="field-input field-input--title"
            maxlength="200"
            placeholder="ex. Risotto de bolets de temporada..."
            :aria-invalid="Boolean(errors.title)"
          />
          <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
        </div>

        <div class="field">
          <label class="field-label" for="recipe-description">
            Descripció o context gastronòmic
          </label>
          <textarea
            id="recipe-description"
            v-model="state.description"
            class="field-textarea"
            rows="3"
            placeholder="Una línia breu que resumeixi la recepta..."
            :aria-invalid="Boolean(errors.description)"
          />
          <span class="field-hint" :class="{ 'is-over': descriptionLength > MAX_TEXT_LENGTH }">
            {{ descriptionLength }} / {{ MAX_TEXT_LENGTH }} caràcters
          </span>
          <p v-if="errors.description" class="field-error">{{ errors.description }}</p>
        </div>

        <div class="param-grid">
          <div class="param-cell">
            <label class="param-caption" for="servings">Comensals</label>
            <div class="param-stepper">
              <button
                type="button"
                class="param-step-btn"
                aria-label="Un comensal menys"
                @click="adjustServings(-1)"
              >
                <span class="material-symbols-outlined">remove</span>
              </button>
              <input
                id="servings"
                v-model="state.servingsText"
                type="number"
                class="param-value"
                min="1"
                max="999"
                placeholder="—"
              />
              <button
                type="button"
                class="param-step-btn"
                aria-label="Un comensal més"
                @click="adjustServings(1)"
              >
                <span class="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          <div class="param-cell">
            <label class="param-caption" for="prep-time">Preparació</label>
            <div class="param-measure">
              <input
                id="prep-time"
                v-model="state.prepTimeText"
                type="number"
                class="param-value"
                min="0"
                max="9999"
                placeholder="—"
              />
              <span class="param-suffix">min</span>
            </div>
          </div>

          <div class="param-cell">
            <label class="param-caption" for="cook-time">Cocció</label>
            <div class="param-measure">
              <input
                id="cook-time"
                v-model="state.cookTimeText"
                type="number"
                class="param-value"
                min="0"
                max="9999"
                placeholder="—"
              />
              <span class="param-suffix">min</span>
            </div>
          </div>

          <div class="param-cell">
            <label class="param-caption" for="difficulty">Dificultat</label>
            <select id="difficulty" v-model="difficultyValue" class="param-select">
              <option value="">Sense indicar</option>
              <option v-for="option in DIFFICULTY_OPTIONS" :key="option.key" :value="option.key">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Classificació -->
      <div class="form-panel form-col-classification">
        <div class="form-panel-head">
          <span class="form-panel-caption">Classificació de l’Arxiu</span>
          <span class="form-panel-aside">Temporada · Àpat</span>
        </div>

        <div>
          <div class="classification-field">
            <span id="season-label" class="classification-label">Temporada òptima</span>
            <div class="season-pills" role="group" aria-labelledby="season-label">
              <button
                v-for="option in SEASON_OPTIONS"
                :key="option.key"
                type="button"
                class="season-pill"
                :class="{ 'is-selected': state.season === option.key }"
                :aria-pressed="state.season === option.key"
                @click="state.season = state.season === option.key ? null : option.key"
              >
                {{ option.label }}
              </button>
            </div>
            <span class="field-hint">Opcional — torna a prémer per treure-la.</span>
          </div>

          <div class="classification-field">
            <span id="category-label" class="classification-label">
              Moment àpat / Categoria *
            </span>
            <div class="category-grid" role="radiogroup" aria-labelledby="category-label">
              <label
                v-for="option in CATEGORY_OPTIONS"
                :key="option.key"
                class="category-option"
                :class="{ 'is-selected': state.category === option.key }"
              >
                <input
                  v-model="state.category"
                  type="radio"
                  name="recipe-category"
                  :value="option.key"
                  :aria-invalid="Boolean(errors.category)"
                />
                <span class="category-option-label">{{ option.longLabel }}</span>
              </label>
            </div>
            <p v-if="errors.category" class="field-error">{{ errors.category }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 02 · Ingredients -->
    <section class="form-panel">
      <div class="form-panel-head">
        <div>
          <span class="form-panel-caption">02 · Taula de Pesades i Ingredients</span>
          <h2 class="form-panel-heading">Proporcions de base per a la mescla</h2>
        </div>
        <span class="form-panel-aside">Llista indexada automàticament</span>
      </div>

      <!-- Suggestions, not a closed list: the unit is free text, so anything
           typed within the stored cap is accepted. -->
      <datalist id="unit-suggestions">
        <option v-for="unit in UNIT_SUGGESTIONS" :key="unit" :value="unit" />
      </datalist>

      <div class="ledger-head" aria-hidden="true">
        <div class="col-quantity">Quantitat</div>
        <div class="col-unit">Unitat</div>
        <div class="col-name">Ingredient</div>
        <div class="col-remove">Retirar</div>
      </div>

      <div class="ledger-rows">
        <div v-for="(ing, i) in state.ingredients" :key="i" class="ingredient-row">
          <div class="col-quantity">
            <span class="cell-label">Quantitat</span>
            <input
              v-model="ing.quantityText"
              type="text"
              class="cell-input"
              placeholder="ex. 250"
              :aria-label="`Quantitat de l'ingredient ${i + 1}`"
              :aria-invalid="Boolean(errors.ingredientRows[i])"
            />
          </div>
          <div class="col-unit">
            <span class="cell-label">Unitat</span>
            <input
              v-model="ing.unitText"
              type="text"
              class="cell-input"
              list="unit-suggestions"
              :maxlength="MAX_UNIT_LENGTH + 1"
              placeholder="ex. g"
              :aria-label="`Unitat de l'ingredient ${i + 1}`"
              :aria-invalid="Boolean(errors.ingredientRows[i])"
            />
          </div>
          <div class="col-name">
            <span class="cell-label">Ingredient</span>
            <input
              v-model="ing.name"
              type="text"
              class="cell-input cell-input--name"
              maxlength="200"
              placeholder="Nom de l'ingredient..."
              :aria-label="`Nom de l'ingredient ${i + 1}`"
              :aria-invalid="Boolean(errors.ingredientRows[i])"
            />
          </div>
          <div class="col-remove">
            <button
              type="button"
              class="icon-btn icon-btn-danger"
              :disabled="state.ingredients.length === 1"
              :aria-label="`Eliminar ingredient ${i + 1}`"
              @click="removeIngredient(i)"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
          <p v-if="errors.ingredientRows[i]" class="row-error">
            {{ errors.ingredientRows[i] }}
          </p>
        </div>
      </div>

      <p v-if="errors.ingredients" class="field-error">{{ errors.ingredients }}</p>

      <button type="button" class="add-row-btn" @click="addIngredient">
        <span class="material-symbols-outlined">add</span>
        Afegir ingredient
      </button>
    </section>

    <!-- 03 · Passos -->
    <section class="form-panel">
      <div class="form-panel-head">
        <div>
          <span class="form-panel-caption">03 · Metodologia de Cuina</span>
          <h2 class="form-panel-heading">Procediment pas a pas</h2>
        </div>
        <span class="form-panel-aside">Descripcions clares i ordenades</span>
      </div>

      <div class="step-cards">
        <div v-for="(step, i) in state.steps" :key="i" class="step-card">
          <div class="step-card-head">
            <span class="step-badge" aria-hidden="true">{{ i + 1 }}</span>
            <div class="step-heading">
              <input
                v-model="step.title"
                type="text"
                class="step-title-input"
                maxlength="120"
                placeholder="Títol del pas (opcional)"
                :aria-label="`Títol del pas ${i + 1}`"
              />
              <span class="step-duration">
                <input
                  v-model="step.durationText"
                  type="number"
                  min="0"
                  max="9999"
                  placeholder="—"
                  :aria-label="`Durada del pas ${i + 1} en minuts`"
                />
                <span class="param-suffix">min</span>
              </span>
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
          <textarea
            v-model="step.instruction"
            class="step-instruction"
            rows="3"
            placeholder="Explica les accions d'aquest pas..."
            :aria-label="`Instrucció del pas ${i + 1}`"
            :aria-invalid="Boolean(errors.stepRows[i])"
          />
          <p v-if="errors.stepRows[i]" class="field-error">{{ errors.stepRows[i] }}</p>
        </div>
      </div>

      <p v-if="errors.steps" class="field-error">{{ errors.steps }}</p>

      <button type="button" class="add-row-btn" @click="addStep">
        <span class="material-symbols-outlined">add_task</span>
        Afegir pas
      </button>
    </section>

    <!-- 04 · Notes -->
    <section class="form-panel">
      <div class="form-panel-head">
        <div>
          <span class="form-panel-caption">04 · Notes del Cuiner</span>
          <h2 class="form-panel-heading">Notes personals i substitucions</h2>
        </div>
        <span class="form-panel-aside">Opcional</span>
      </div>

      <div class="field">
        <label class="field-label" for="recipe-notes">Notes</label>
        <textarea
          id="recipe-notes"
          v-model="state.notes"
          class="field-textarea"
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
      <p class="draft-footer">
        <span class="material-symbols-outlined">verified</span>
        Desat local automàtic actiu
      </p>
      <div class="actions-buttons">
        <button type="button" class="btn-ghost" @click="onCancel">Cancel·lar</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <span class="material-symbols-outlined">save</span>
          {{ submitting ? 'Guardant...' : submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>
