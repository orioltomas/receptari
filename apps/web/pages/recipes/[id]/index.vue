<script setup lang="ts">
import type { Recipe } from '@receptari/shared';

const route = useRoute();
const id = computed(() => String(route.params.id));

const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

/**
 * Ticked ingredients live here and nowhere else: no storage, no API. Cooking
 * along a list is a single session, so the marks are meant to disappear on a
 * reload. They are keyed by ingredient id, not by list position, so neither a
 * re-render nor a change of servings can move a tick onto another ingredient.
 */
const checkedIngredients = ref<Set<string>>(new Set());

/**
 * The servings the ingredient list is currently rendered for. Display only —
 * it is never sent anywhere, so reloading returns to the stored servings.
 */
const targetServings = ref<number | null>(null);

const confirmingDelete = ref(false);
const deleting = ref(false);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

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

watch(
  recipe,
  (r) => {
    targetServings.value = r?.servings ?? null;
    checkedIngredients.value = new Set();
  },
  { immediate: true },
);

useHead({
  title: () => (recipe.value ? `${recipe.value.title} · Receptari` : 'Receptari'),
});

/* ---------- Presentació ---------- */

const seasonName = computed(() => (recipe.value?.season ? seasonLabel(recipe.value.season) : null));
const categoryName = computed(() =>
  recipe.value ? categoryShortLabel(recipe.value.category) : null,
);
const difficultyName = computed(() =>
  recipe.value?.difficulty ? difficultyLabel(recipe.value.difficulty) : null,
);

/**
 * Season, category and difficulty are the only classification axes there are.
 * The optional ones are absent rather than empty, so the `/` separators are
 * drawn from the surviving chips instead of a fixed layout.
 */
const classificationChips = computed(() =>
  [seasonName.value, categoryName.value, difficultyName.value].filter(
    (label): label is string => label != null,
  ),
);

const EMPTY_FIELD = '—';

const prepTimeText = computed(() =>
  recipe.value?.prepTimeMinutes != null ? `${recipe.value.prepTimeMinutes} min` : EMPTY_FIELD,
);
const cookTimeText = computed(() =>
  recipe.value?.cookTimeMinutes != null ? `${recipe.value.cookTimeMinutes} min` : EMPTY_FIELD,
);
const servingsText = computed(() =>
  recipe.value?.servings != null ? String(recipe.value.servings) : EMPTY_FIELD,
);

const stepCountText = computed(() => {
  const total = recipe.value?.steps.length ?? 0;
  return total === 1 ? '1 pas' : `${total} passos`;
});

/** `01`, `02`, … — the design's numerals, not a plain ordinal. */
function stepNumeral(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/**
 * The caption beside a step's numeral. Only the duration has a field behind it;
 * the step's own title gets the heading below, so it is not repeated here.
 */
function stepPhase(step: Recipe['steps'][number]): string | null {
  return step.durationMinutes != null ? `${step.durationMinutes} min` : null;
}

const updatedAtText = computed(() => {
  if (!recipe.value) return '';
  return new Intl.DateTimeFormat('ca-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(recipe.value.updatedAt));
});

/* ---------- Escalat de comensals ---------- */

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 99;

/** Without stored servings there is no factor to scale from, so no stepper. */
const canScale = computed(() => recipe.value?.servings != null);

const isScaled = computed(
  () => canScale.value && targetServings.value !== (recipe.value?.servings ?? null),
);

function changeServings(delta: number) {
  if (targetServings.value == null) return;
  const next = targetServings.value + delta;
  if (next < MIN_SERVINGS || next > MAX_SERVINGS) return;
  targetServings.value = next;
}

function resetServings() {
  targetServings.value = recipe.value?.servings ?? null;
}

/** The unit string is copied verbatim: 1000 g never becomes 1 kg. */
const scaledIngredients = computed(() =>
  (recipe.value?.ingredients ?? []).map((ing) =>
    scaleIngredient(ing, recipe.value?.servings, targetServings.value),
  ),
);

function toggleIngredient(ingredientId: string) {
  const next = new Set(checkedIngredients.value);
  if (next.has(ingredientId)) next.delete(ingredientId);
  else next.add(ingredientId);
  checkedIngredients.value = next;
}

/* ---------- Accions ---------- */

function printRecipe() {
  if (typeof window !== 'undefined') window.print();
}

async function share() {
  if (typeof window === 'undefined') return;
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied.value = true;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch {
    error.value = 'No s’ha pogut copiar l’enllaç.';
  }
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onDialogKeydown);
});

/**
 * Deleting is irreversible and cascades to the ingredients and steps, so it is
 * always gated behind an explicit confirmation that says so. Dismissing does
 * nothing at all.
 */
function askDelete() {
  confirmingDelete.value = true;
}

function cancelDelete() {
  confirmingDelete.value = false;
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') cancelDelete();
}

watch(confirmingDelete, (open) => {
  if (typeof document === 'undefined') return;
  if (open) document.addEventListener('keydown', onDialogKeydown);
  else document.removeEventListener('keydown', onDialogKeydown);
});

async function confirmDelete() {
  if (!recipe.value || deleting.value) return;
  deleting.value = true;
  try {
    await useRecipes().remove(recipe.value.id);
    confirmingDelete.value = false;
    await navigateTo('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error esborrant la recepta';
    confirmingDelete.value = false;
  } finally {
    deleting.value = false;
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

    <article v-else-if="recipe" class="detail">
      <div class="detail-actionbar no-print">
        <NuxtLink to="/" class="detail-back">
          <span class="material-symbols-outlined" aria-hidden="true">west</span>
          Tornar a les receptes
        </NuxtLink>

        <!-- The labels are hidden below md, so each action carries its own
             accessible name rather than relying on the visible text. -->
        <div class="detail-action-group">
          <button type="button" class="detail-action" aria-label="Imprimir" @click="printRecipe">
            <span class="material-symbols-outlined" aria-hidden="true">print</span>
            <span class="detail-action-label">Imprimir</span>
          </button>
          <button type="button" class="detail-action" aria-label="Compartir" @click="share">
            <span class="material-symbols-outlined" aria-hidden="true">link</span>
            <span class="detail-action-label">Compartir</span>
          </button>
          <NuxtLink
            :to="`/recipes/${recipe.id}/edit`"
            class="detail-action"
            aria-label="Editar la recepta"
          >
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            <span class="detail-action-label">Editar</span>
          </NuxtLink>
          <button
            type="button"
            class="detail-action is-danger"
            aria-label="Esborrar la recepta"
            @click="askDelete"
          >
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
            <span class="detail-action-label">Esborrar</span>
          </button>
        </div>
      </div>

      <p v-if="error" class="error no-print">{{ error }}</p>

      <header class="detail-header">
        <div class="detail-chips">
          <template v-for="(chip, i) in classificationChips" :key="chip">
            <span v-if="i > 0" class="detail-chip-separator" aria-hidden="true">/</span>
            <span class="detail-chip">{{ chip }}</span>
          </template>
        </div>

        <h1 class="detail-title">{{ recipe.title }}</h1>

        <p v-if="recipe.description" class="detail-description">{{ recipe.description }}</p>

        <dl class="detail-stats">
          <div>
            <dt class="detail-stat-label">Temps Prep</dt>
            <dd class="detail-stat-value">{{ prepTimeText }}</dd>
          </div>
          <div>
            <dt class="detail-stat-label">Temps Cocció</dt>
            <dd class="detail-stat-value">{{ cookTimeText }}</dd>
          </div>
          <div>
            <dt class="detail-stat-label">Comensals</dt>
            <dd class="detail-stat-value is-accent">{{ servingsText }}</dd>
          </div>
          <div>
            <dt class="detail-stat-label">Dificultat</dt>
            <dd class="detail-stat-value">{{ difficultyName ?? EMPTY_FIELD }}</dd>
          </div>
        </dl>
      </header>

      <div class="detail-body">
        <aside class="detail-aside">
          <section class="detail-panel">
            <div class="detail-panel-header">
              <h2 class="detail-panel-title">Ingredients</h2>

              <div v-if="canScale" class="scaler no-print">
                <button
                  type="button"
                  class="scaler-button"
                  aria-label="Menys comensals"
                  :disabled="(targetServings ?? MIN_SERVINGS) <= MIN_SERVINGS"
                  @click="changeServings(-1)"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">remove</span>
                </button>
                <output class="scaler-value" aria-label="Comensals">
                  {{ targetServings }} racions
                </output>
                <button
                  type="button"
                  class="scaler-button"
                  aria-label="Més comensals"
                  :disabled="(targetServings ?? MAX_SERVINGS) >= MAX_SERVINGS"
                  @click="changeServings(1)"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">add</span>
                </button>
              </div>
            </div>

            <p class="detail-panel-hint">
              Marca cada ingredient a mesura que el vagis fent servir. Les marques només duren
              aquesta sessió.
            </p>

            <p v-if="isScaled" class="scaler-note no-print">
              Quantitats ajustades per a {{ targetServings }} comensals (la recepta n’indica
              {{ recipe.servings }}). No es desa res.
              <button type="button" class="link-btn" @click="resetServings">Restaurar</button>
            </p>

            <ul class="ingredients-list">
              <li v-for="ing in scaledIngredients" :key="ing.id">
                <button
                  type="button"
                  class="ingredient-item"
                  :class="{ 'is-checked': checkedIngredients.has(ing.id) }"
                  :aria-pressed="checkedIngredients.has(ing.id)"
                  @click="toggleIngredient(ing.id)"
                >
                  <span class="ingredient-box" aria-hidden="true">
                    <span class="material-symbols-outlined">check</span>
                  </span>
                  <span class="ingredient-name">{{ ing.name }}</span>
                  <span class="ingredient-quantity">{{
                    formatQuantity(ing.quantity, ing.unit)
                  }}</span>
                </button>
              </li>
            </ul>
          </section>

          <section v-if="recipe.notes" class="detail-panel">
            <h2 class="detail-panel-title">Notes</h2>
            <p class="notes-text">{{ recipe.notes }}</p>
          </section>
        </aside>

        <div class="detail-main">
          <div class="steps-header">
            <h2 class="steps-title">Elaboració pas a pas</h2>
            <span class="steps-count">{{ stepCountText }}</span>
          </div>

          <ol class="steps-list">
            <li v-for="(step, i) in recipe.steps" :key="step.id" class="step-card">
              <div class="step-card-head">
                <span class="step-number" aria-hidden="true">{{ stepNumeral(i) }}</span>
                <span v-if="stepPhase(step)" class="step-phase">{{ stepPhase(step) }}</span>
              </div>
              <h3 v-if="step.title" class="step-title">{{ step.title }}</h3>
              <p class="step-instruction">{{ step.instruction }}</p>
            </li>
          </ol>
        </div>
      </div>

      <p class="detail-colophon">Última modificació: {{ updatedAtText }} · Creada per tu</p>
    </article>

    <!-- Confirmació d'esborrat: bloqueja fins que es confirma. -->
    <div v-if="confirmingDelete" class="modal-backdrop no-print" @click.self="cancelDelete">
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-body"
      >
        <h2 id="delete-title" class="modal-title">Esborrar aquesta recepta?</h2>
        <p id="delete-body" class="modal-body">
          S’esborrarà «{{ recipe?.title }}» amb tots els seus ingredients i passos.
          <strong>És permanent i no es pot desfer.</strong>
        </p>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" @click="cancelDelete">Cancel·lar</button>
          <button type="button" class="btn-danger" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Esborrant...' : 'Esborrar definitivament' }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="copied" class="toast no-print" role="status">Copiat!</p>
  </div>
</template>
