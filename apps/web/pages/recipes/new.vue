<script setup lang="ts">
import type { CreateRecipeInput } from '@receptari/shared';

definePageMeta({ title: 'Nova recepta' });

interface IngredientDraft {
  quantityText: string;
  name: string;
}

interface StepDraft {
  instruction: string;
}

const title = ref('');
const description = ref<string | null>(null);
const notes = ref<string | null>(null);
const prepTime = ref('');
const cookTime = ref('');
const servings = ref('');
const imageUrl = ref<string | null>(null);
const tagsText = ref('');
const season = ref<string | null>(null);
const showImageInput = ref(false);

const ingredients = ref<IngredientDraft[]>([{ quantityText: '', name: '' }]);
const steps = ref<StepDraft[]>([{ instruction: '' }]);

const submitting = ref(false);
const error = ref<string | null>(null);

function onPhotoClick() {
  showImageInput.value = true;
}

watch(imageUrl, (value) => {
  if (value && value.trim().length > 0) showImageInput.value = true;
});

function addIngredient() {
  ingredients.value.push({ quantityText: '', name: '' });
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

function buildTags(): string[] {
  const others = parseTags(tagsText.value).filter((t) => !isSeasonTag(t));
  return [...(season.value ? [season.value] : []), ...others].slice(0, 10);
}

function buildPayload(): CreateRecipeInput {
  return {
    title: title.value.trim(),
    description: description.value?.trim() || null,
    notes: notes.value?.trim() || null,
    prepTimeMinutes: numOrNull(prepTime.value),
    cookTimeMinutes: numOrNull(cookTime.value),
    servings: numOrNull(servings.value),
    imageUrl: imageUrl.value?.trim() || null,
    isFavorite: false,
    tags: buildTags(),
    ingredients: ingredients.value
      .filter((i) => i.name.trim().length > 0)
      .map((i) => {
        const { quantity, unit } = parseQuantityInput(i.quantityText);
        return { name: i.name.trim(), quantity, unit };
      }),
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
  <div class="form-page">
    <header class="page-header">
      <h1 class="display-lg">Nova Recepta</h1>
      <p class="page-lead">
        Comparteix la teva última creació culinària. Afegeix els detalls perquè
        quedi registrada amb la màxima precisió.
      </p>
    </header>

    <form @submit.prevent="onSubmit">
      <!-- Foto (opcional) -->
      <button type="button" class="photo-drop" :class="{ 'has-image': imageUrl }" @click="onPhotoClick">
        <img v-if="imageUrl" :src="imageUrl" alt="Vista prèvia de la recepta" />
        <span class="material-symbols-outlined ms-fill">image</span>
        <span class="photo-drop-title">Afegeix una foto de la recepta</span>
        <span class="photo-drop-hint">Opcional</span>
      </button>

      <div v-if="showImageInput" class="field photo-url-field">
        <label class="field-label" for="recipe-image">URL de la imatge</label>
        <input
          id="recipe-image"
          v-model="imageUrl"
          type="url"
          class="input"
          placeholder="https://..."
        />
      </div>

      <!-- Informació bàsica -->
      <section class="form-section">
        <div class="field" style="margin-bottom: 1rem">
          <label class="field-label" for="recipe-title">Títol de la recepta</label>
          <input
            id="recipe-title"
            v-model="title"
            type="text"
            class="input input--lg"
            placeholder="Ex: Risotto de bolets de temporada"
            required
          />
        </div>

        <div class="field" style="margin-bottom: 1rem">
          <label class="field-label" for="recipe-description">Descripció</label>
          <textarea
            id="recipe-description"
            v-model="description"
            class="textarea"
            rows="2"
            placeholder="Una línia breu que resumeixi la recepta..."
          />
        </div>

        <div class="form-grid">
          <div class="field">
            <label class="field-label" for="servings">Comensals</label>
            <div class="icon-field">
              <span class="material-symbols-outlined">group</span>
              <input
                id="servings"
                v-model="servings"
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
                v-model="prepTime"
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
                v-model="cookTime"
                type="number"
                class="input"
                min="0"
                max="9999"
                placeholder="45"
              />
            </div>
          </div>
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
            :key="option.name"
            type="button"
            class="season-option"
            :class="[`tone-${option.tone}`, { 'is-selected': season === option.name }]"
            :aria-pressed="season === option.name"
            @click="season = season === option.name ? null : option.name"
          >
            <span class="material-symbols-outlined">{{ option.icon }}</span>
            <span>{{ option.name }}</span>
          </button>
        </div>

        <div class="field" style="margin-top: 1.25rem">
          <label class="field-label" for="recipe-tags">Etiquetes</label>
          <input
            id="recipe-tags"
            v-model="tagsText"
            type="text"
            class="input"
            placeholder="Cremós, Del camp, Ràpid..."
          />
          <span class="field-hint">Separa les etiquetes amb comes.</span>
        </div>
      </section>

      <!-- Ingredients -->
      <section class="form-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="material-symbols-outlined">kitchen</span>
            Ingredients
          </h2>
        </div>

        <div v-for="(ing, i) in ingredients" :key="i" class="ingredient-row">
          <input
            v-model="ing.quantityText"
            type="text"
            class="input ingredient-qty"
            placeholder="Quantitat (ex: 200g)"
            :aria-label="`Quantitat de l'ingredient ${i + 1}`"
          />
          <input
            v-model="ing.name"
            type="text"
            class="input ingredient-name"
            placeholder="Ingredient (ex: Arròs Arborio)"
            :aria-label="`Nom de l'ingredient ${i + 1}`"
          />
          <button
            type="button"
            class="icon-btn icon-btn-danger"
            :disabled="ingredients.length === 1"
            :aria-label="`Eliminar ingredient ${i + 1}`"
            @click="removeIngredient(i)"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <button type="button" class="add-row-btn" @click="addIngredient">
          <span class="material-symbols-outlined">add</span>
          Afegir Ingredient
        </button>
      </section>

      <!-- Passos -->
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

        <div v-for="(step, i) in steps" :key="i" class="step-row">
          <span class="step-num">{{ i + 1 }}</span>
          <textarea
            v-model="step.instruction"
            class="textarea"
            rows="2"
            placeholder="Descriu el pas..."
            :aria-label="`Pas ${i + 1}`"
          />
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
              :disabled="i === steps.length - 1"
              aria-label="Moure avall"
              @click="moveStep(i, 1)"
            >
              <span class="material-symbols-outlined">arrow_downward</span>
            </button>
            <button
              type="button"
              class="icon-btn icon-btn-danger"
              :disabled="steps.length === 1"
              :aria-label="`Eliminar pas ${i + 1}`"
              @click="removeStep(i)"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Notes -->
      <section class="form-section">
        <div class="section-header">
          <h2 class="section-title">Notes addicionals</h2>
        </div>
        <div class="field">
          <textarea
            v-model="notes"
            class="textarea"
            rows="3"
            placeholder="Suggeriments de maridatge, possibles substitucions d'ingredients, o consells personals..."
          />
          <span class="field-hint">Opcional</span>
        </div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions-row">
        <NuxtLink to="/" class="btn-ghost">Cancel·lar</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <span class="material-symbols-outlined">save</span>
          {{ submitting ? 'Guardant...' : 'Guardar Recepta' }}
        </button>
      </div>
    </form>
  </div>
</template>
