<script setup lang="ts">
import type { Recipe, UpdateRecipeInput } from '@receptari/shared';

interface IngredientDraft {
  quantityText: string;
  name: string;
}
interface StepDraft {
  instruction: string;
}

const route = useRoute();
const id = computed(() => String(route.params.id));

const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const editing = ref(false);
const checkedIngredients = ref<Set<string>>(new Set());

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

function toggleIngredient(ingredientId: string) {
  if (checkedIngredients.value.has(ingredientId)) {
    checkedIngredients.value.delete(ingredientId);
  } else {
    checkedIngredients.value.add(ingredientId);
  }
}

/* ---------- Edició ---------- */

const editTitle = ref('');
const editDescription = ref('');
const editNotes = ref('');
const editPrep = ref('');
const editCook = ref('');
const editServings = ref('');
const editImageUrl = ref('');
const editTagsText = ref('');
const editSeason = ref<string | null>(null);
const showImageInput = ref(false);

const editIngredients = ref<IngredientDraft[]>([]);
const editSteps = ref<StepDraft[]>([]);

function resetEditForm(r: Recipe) {
  editTitle.value = r.title;
  editDescription.value = r.description ?? '';
  editNotes.value = r.notes ?? '';
  editPrep.value = r.prepTimeMinutes != null ? String(r.prepTimeMinutes) : '';
  editCook.value = r.cookTimeMinutes != null ? String(r.cookTimeMinutes) : '';
  editServings.value = r.servings != null ? String(r.servings) : '';
  editImageUrl.value = r.imageUrl ?? '';
  showImageInput.value = r.imageUrl != null;
  const seasonTag = r.tags.find((t) => isSeasonTag(t));
  editSeason.value = seasonTag ?? null;
  editTagsText.value = r.tags.filter((t) => !isSeasonTag(t)).join(', ');
  editIngredients.value =
    r.ingredients.length > 0
      ? r.ingredients.map((i) => ({
          quantityText: formatQuantity(i.quantity, i.unit),
          name: i.name,
        }))
      : [{ quantityText: '', name: '' }];
  editSteps.value =
    r.steps.length > 0
      ? r.steps.map((s) => ({ instruction: s.instruction }))
      : [{ instruction: '' }];
}

watch(
  recipe,
  (r) => {
    if (!r) return;
    resetEditForm(r);
  },
  { immediate: true },
);

function startEdit() {
  editing.value = true;
  if (recipe.value) resetEditForm(recipe.value);
}
function cancelEdit() {
  editing.value = false;
  if (recipe.value) resetEditForm(recipe.value);
}

function addIngredient() {
  editIngredients.value.push({ quantityText: '', name: '' });
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

function buildTags(): string[] {
  const others = parseTags(editTagsText.value).filter((t) => !isSeasonTag(t));
  return [...(editSeason.value ? [editSeason.value] : []), ...others].slice(0, 10);
}

async function saveEdit() {
  if (!recipe.value) return;
  if (!editTitle.value.trim()) {
    error.value = 'El títol és obligatori';
    return;
  }
  const payload: UpdateRecipeInput = {
    title: editTitle.value.trim(),
    description: editDescription.value.trim() || null,
    notes: editNotes.value.trim() || null,
    prepTimeMinutes: numOrNull(editPrep.value),
    cookTimeMinutes: numOrNull(editCook.value),
    servings: numOrNull(editServings.value),
    imageUrl: editImageUrl.value.trim() || null,
    isFavorite: recipe.value.isFavorite,
    tags: buildTags(),
    ingredients: editIngredients.value
      .filter((i) => i.name.trim().length > 0)
      .map((i) => {
        const { quantity, unit } = parseQuantityInput(i.quantityText);
        return { name: i.name.trim(), quantity, unit };
      }),
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

async function toggleFavorite() {
  if (!recipe.value) return;
  const next = !recipe.value.isFavorite;
  try {
    await useRecipes().toggleFavorite(recipe.value.id, next);
    recipe.value.isFavorite = next;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error actualitzant favorit';
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="empty">Carregant...</div>

    <div v-else-if="error && !recipe">
      <p class="error">{{ error }}</p>
      <NuxtLink to="/" class="btn-primary">Tornar</NuxtLink>
    </div>

    <template v-else-if="recipe">
      <!-- Vista detall -->
      <div v-if="!editing" class="detail-header">
        <div class="detail-info">
          <NuxtLink to="/" class="nav-link">
            <span class="material-symbols-outlined">arrow_back</span>
            Tornar
          </NuxtLink>
          <h1 class="detail-title">{{ recipe.title }}</h1>
          <div class="detail-meta">
            <span v-if="totalTimeLabel(recipe.prepTimeMinutes, recipe.cookTimeMinutes) !== '—'">
              <span class="material-symbols-outlined">schedule</span>
              {{ totalTimeLabel(recipe.prepTimeMinutes, recipe.cookTimeMinutes) }}
            </span>
            <span v-if="recipe.servings != null">
              <span class="material-symbols-outlined">group</span>
              {{ recipe.servings }} comensals
            </span>
            <span>
              {{ recipe.ingredients.length }} ingredients · {{ recipe.steps.length }} passos
            </span>
          </div>
          <div v-if="recipe.tags.length" class="card-tags">
            <span
              v-for="(tag, ti) in recipe.tags"
              :key="tag"
              class="tag"
              :class="{ 'tone-sage': ti === 0 }"
            >
              {{ tag }}
            </span>
          </div>
          <div class="detail-actions">
            <button type="button" class="btn-primary" @click="startEdit">
              <span class="material-symbols-outlined">edit</span>
              Editar
            </button>
            <button
              type="button"
              class="btn-ghost"
              :class="{ 'is-favorite': recipe.isFavorite }"
              @click="toggleFavorite"
            >
              <span class="material-symbols-outlined">favorite</span>
              {{ recipe.isFavorite ? 'Favorit' : 'Afegir a favorits' }}
            </button>
            <button type="button" class="btn-danger" @click="deleteRecipe">
              <span class="material-symbols-outlined">delete</span>
              Esborrar
            </button>
          </div>
        </div>

        <div class="detail-media">
          <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.title" />
          <span v-else class="material-symbols-outlined">restaurant_menu</span>
        </div>
      </div>

      <div v-if="!editing">
        <p v-if="recipe.description" class="detail-lead">{{ recipe.description }}</p>

        <section class="form-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined">kitchen</span>
            Ingredients
          </h2>
          <ul class="ingredients-list">
            <li v-for="ing in recipe.ingredients" :key="ing.id">
              <button
                type="button"
                class="ingredient-item"
                :class="{ 'is-checked': checkedIngredients.has(ing.id) }"
                @click="toggleIngredient(ing.id)"
              >
                <span class="ingredient-box">
                  <span class="material-symbols-outlined">check</span>
                </span>
                <span class="ingredient-text">{{ formatIngredient(ing) }}</span>
              </button>
            </li>
          </ul>
          <p v-if="recipe.ingredients.length === 0" class="field-hint">
            Aquesta recepta no té ingredients registrats.
          </p>
        </section>

        <section class="form-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined">menu_book</span>
            Pas a pas
          </h2>
          <ol class="steps-list">
            <li v-for="(step, i) in recipe.steps" :key="step.id">
              <span class="step-num">{{ i + 1 }}</span>
              <span class="step-text">{{ step.instruction }}</span>
            </li>
          </ol>
        </section>

        <section v-if="recipe.notes" class="form-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined">sticky_note_2</span>
            Notes
          </h2>
          <p class="notes-text">{{ recipe.notes }}</p>
        </section>
      </div>

      <!-- Edició -->
      <form v-else class="form-page" @submit.prevent="saveEdit">
        <button
          type="button"
          class="photo-drop"
          :class="{ 'has-image': editImageUrl }"
          @click="showImageInput = true"
        >
          <img v-if="editImageUrl" :src="editImageUrl" alt="Vista prèvia de la recepta" />
          <span class="material-symbols-outlined ms-fill">image</span>
          <span class="photo-drop-title">Canvia la foto de la recepta</span>
          <span class="photo-drop-hint">Opcional</span>
        </button>

        <div v-if="showImageInput" class="field photo-url-field">
          <label class="field-label" for="edit-image">URL de la imatge</label>
          <input id="edit-image" v-model="editImageUrl" type="url" class="input" placeholder="https://..." />
        </div>

        <section class="form-section">
          <div class="field" style="margin-bottom: 1rem">
            <label class="field-label" for="edit-title">Títol</label>
            <input id="edit-title" v-model="editTitle" type="text" class="input input--lg" required />
          </div>

          <div class="field" style="margin-bottom: 1rem">
            <label class="field-label" for="edit-description">Descripció</label>
            <textarea id="edit-description" v-model="editDescription" class="textarea" rows="2" />
          </div>

          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="edit-servings">Comensals</label>
              <div class="icon-field">
                <span class="material-symbols-outlined">group</span>
                <input id="edit-servings" v-model="editServings" type="number" class="input" min="1" max="999" />
              </div>
            </div>
            <div class="field">
              <label class="field-label" for="edit-prep">Temps de preparació (min)</label>
              <div class="icon-field">
                <span class="material-symbols-outlined">schedule</span>
                <input id="edit-prep" v-model="editPrep" type="number" class="input" min="0" max="9999" />
              </div>
            </div>
            <div class="field">
              <label class="field-label" for="edit-cook">Temps de cocció (min)</label>
              <div class="icon-field">
                <span class="material-symbols-outlined">local_fire_department</span>
                <input id="edit-cook" v-model="editCook" type="number" class="input" min="0" max="9999" />
              </div>
            </div>
          </div>
        </section>

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
              :class="[`tone-${option.tone}`, { 'is-selected': editSeason === option.name }]"
              :aria-pressed="editSeason === option.name"
              @click="editSeason = editSeason === option.name ? null : option.name"
            >
              <span class="material-symbols-outlined">{{ option.icon }}</span>
              <span>{{ option.name }}</span>
            </button>
          </div>

          <div class="field" style="margin-top: 1.25rem">
            <label class="field-label" for="edit-tags">Etiquetes</label>
            <input id="edit-tags" v-model="editTagsText" type="text" class="input" />
            <span class="field-hint">Separa les etiquetes amb comes.</span>
          </div>
        </section>

        <section class="form-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="material-symbols-outlined">kitchen</span>
              Ingredients
            </h2>
          </div>
          <div v-for="(ing, i) in editIngredients" :key="i" class="ingredient-row">
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
              :disabled="editIngredients.length === 1"
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
          <div v-for="(step, i) in editSteps" :key="i" class="step-row">
            <span class="step-num">{{ i + 1 }}</span>
            <textarea
              v-model="step.instruction"
              class="textarea"
              rows="2"
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
                :disabled="i === editSteps.length - 1"
                aria-label="Moure avall"
                @click="moveStep(i, 1)"
              >
                <span class="material-symbols-outlined">arrow_downward</span>
              </button>
              <button
                type="button"
                class="icon-btn icon-btn-danger"
                :disabled="editSteps.length === 1"
                :aria-label="`Eliminar pas ${i + 1}`"
                @click="removeStep(i)"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="section-header">
            <h2 class="section-title">Notes addicionals</h2>
          </div>
          <div class="field">
            <textarea id="edit-notes" v-model="editNotes" class="textarea" rows="3" />
            <span class="field-hint">Opcional</span>
          </div>
        </section>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="actions-row">
          <button type="button" class="btn-ghost" @click="cancelEdit">Cancel·lar</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            <span class="material-symbols-outlined">save</span>
            {{ saving ? 'Desant...' : 'Desar canvis' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
