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
 * reload.
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
      <nav class="detail-breadcrumb no-print" aria-label="Ruta">
        <NuxtLink to="/">Receptari</NuxtLink>
        <template v-if="seasonName">
          <span aria-hidden="true">/</span>
          <span>{{ seasonName }}</span>
        </template>
        <span aria-hidden="true">/</span>
        <span>{{ categoryName }}</span>
      </nav>

      <div class="detail-top no-print">
        <NuxtLink to="/" class="nav-link">
          <span class="material-symbols-outlined">arrow_back</span>
          Tornar al receptari
        </NuxtLink>

        <div class="detail-actionbar">
          <button type="button" class="btn-ghost" @click="printRecipe">
            <span class="material-symbols-outlined">print</span>
            Imprimir
          </button>
          <button type="button" class="btn-ghost" @click="share">
            <span class="material-symbols-outlined">link</span>
            Compartir
          </button>
          <NuxtLink :to="`/recipes/${recipe.id}/edit`" class="btn-primary">
            <span class="material-symbols-outlined">edit</span>
            Editar
          </NuxtLink>
        </div>
      </div>

      <p v-if="error" class="error no-print">{{ error }}</p>

      <header class="detail-intro">
        <div class="detail-chips">
          <span class="tag tone-sage">{{ categoryName }}</span>
          <span v-if="seasonName" class="tag">{{ seasonName }}</span>
        </div>
        <h1 class="detail-title">{{ recipe.title }}</h1>
        <blockquote v-if="recipe.description" class="detail-quote">
          {{ recipe.description }}
        </blockquote>
      </header>

      <dl class="detail-facts">
        <div v-if="recipe.prepTimeMinutes != null" class="detail-fact">
          <dt>Preparació</dt>
          <dd>{{ recipe.prepTimeMinutes }} min</dd>
        </div>
        <div v-if="recipe.cookTimeMinutes != null" class="detail-fact">
          <dt>Cocció</dt>
          <dd>{{ recipe.cookTimeMinutes }} min</dd>
        </div>
        <div v-if="recipe.servings != null" class="detail-fact">
          <dt>Comensals</dt>
          <dd>{{ recipe.servings }}</dd>
        </div>
        <div v-if="difficultyName" class="detail-fact">
          <dt>Dificultat</dt>
          <dd>{{ difficultyName }}</dd>
        </div>
      </dl>

      <section class="form-section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="material-symbols-outlined">kitchen</span>
            Ingredients
          </h2>

          <div v-if="canScale" class="scaler no-print">
            <span id="scaler-label" class="scaler-label">Comensals</span>
            <div class="scaler-controls">
              <button
                type="button"
                class="icon-btn"
                aria-label="Menys comensals"
                :disabled="(targetServings ?? MIN_SERVINGS) <= MIN_SERVINGS"
                @click="changeServings(-1)"
              >
                <span class="material-symbols-outlined">remove</span>
              </button>
              <output class="scaler-value" aria-labelledby="scaler-label">
                {{ targetServings }}
              </output>
              <button
                type="button"
                class="icon-btn"
                aria-label="Més comensals"
                :disabled="(targetServings ?? MAX_SERVINGS) >= MAX_SERVINGS"
                @click="changeServings(1)"
              >
                <span class="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>
        </div>

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
              <span class="ingredient-box">
                <span class="material-symbols-outlined">check</span>
              </span>
              <span class="ingredient-text">{{ formatIngredient(ing) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section v-if="recipe.notes" class="form-section">
        <h2 class="section-title">
          <span class="material-symbols-outlined">sticky_note_2</span>
          Notes
        </h2>
        <p class="notes-text">{{ recipe.notes }}</p>
      </section>

      <section class="form-section">
        <h2 class="section-title">
          <span class="material-symbols-outlined">menu_book</span>
          Pas a pas
        </h2>
        <ol class="detail-steps">
          <li v-for="(step, i) in recipe.steps" :key="step.id" class="detail-step">
            <span class="detail-step-num" aria-hidden="true">{{ i + 1 }}</span>
            <div class="detail-step-body">
              <h3 v-if="step.title" class="detail-step-title">{{ step.title }}</h3>
              <p class="detail-step-text">{{ step.instruction }}</p>
              <p v-if="step.durationMinutes != null" class="detail-step-duration">
                <span class="material-symbols-outlined">schedule</span>
                {{ step.durationMinutes }} min
              </p>
            </div>
          </li>
        </ol>
      </section>

      <div class="detail-danger no-print">
        <button type="button" class="btn-danger" @click="askDelete">
          <span class="material-symbols-outlined">delete</span>
          Esborrar recepta
        </button>
      </div>
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

<style scoped>
.detail-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--on-surface-variant);
  margin-bottom: 1rem;
}

.detail-breadcrumb a {
  color: var(--on-surface-variant);
}

.detail-breadcrumb a:hover {
  color: var(--primary);
}

.detail-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-actionbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.detail-intro {
  margin-bottom: 1.5rem;
}

.detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.detail-quote {
  margin: 1rem 0 0;
  padding: 0.25rem 0 0.25rem 1rem;
  border-left: 3px solid var(--primary-fixed-dim);
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-style: italic;
  line-height: 1.6;
  color: var(--on-surface-variant);
}

.detail-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin: 0 0 2rem;
  padding: 1rem 0;
  border-top: 1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent);
}

.detail-fact dt {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--on-surface-variant);
}

.detail-fact dd {
  margin: 0.2rem 0 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--on-surface);
}

/* Escalador de comensals */
.scaler {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.scaler-label {
  font-size: 0.8rem;
  color: var(--on-surface-variant);
}

.scaler-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: var(--radius-pill);
  background: var(--surface-container-low);
}

.scaler-value {
  min-width: 2rem;
  text-align: center;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--on-surface);
}

.scaler-note {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--on-surface-variant);
}

.link-btn {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
}

/* Passos amb numeral gran */
.detail-steps {
  list-style: none;
  margin: 0;
  padding: 0;
}

.detail-step {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--outline-variant) 25%, transparent);
}

.detail-step:last-child {
  border-bottom: none;
}

.detail-step-num {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
  color: var(--primary-fixed-dim);
}

.detail-step-title {
  margin: 0 0 0.25rem;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--on-surface);
}

.detail-step-text {
  margin: 0;
  line-height: 1.65;
  color: var(--on-surface);
  white-space: pre-wrap;
}

.detail-step-duration {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  color: var(--on-surface-variant);
}

.detail-step-duration .material-symbols-outlined {
  font-size: 1rem;
}

.detail-danger {
  display: flex;
  justify-content: flex-end;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent);
}

/* Diàleg de confirmació */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(20, 19, 16, 0.55);
}

.modal {
  width: 100%;
  max-width: 26rem;
  padding: 1.75rem;
  border-radius: var(--radius-xl);
  background: var(--surface-container-lowest);
  box-shadow: var(--shadow-xl);
}

.modal-title {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--on-surface);
}

.modal-body {
  margin: 0 0 1.5rem;
  line-height: 1.6;
  color: var(--on-surface-variant);
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 6.5rem;
  transform: translateX(-50%);
  z-index: 110;
  margin: 0;
  padding: 0.6rem 1.1rem;
  border-radius: var(--radius-pill);
  background: var(--inverse-surface);
  color: var(--inverse-on-surface);
  font-size: 0.9rem;
  box-shadow: var(--shadow-md);
}
</style>

<!--
  Print rules live in this component rather than the global stylesheet: they are
  specific to this page and the design system owns main.css. Not scoped, because
  the nav lives outside this component and paper has no navigation.
-->
<style>
@media print {
  /* Paper is always light, whatever the screen theme is set to. */
  :root,
  .dark {
    --background: #ffffff;
    --surface: #ffffff;
    --surface-container-lowest: #ffffff;
    --surface-container-low: #ffffff;
    --surface-container: #ffffff;
    --surface-container-high: #ffffff;
    --surface-container-highest: #ffffff;
    --surface-variant: #ffffff;
    --surface-dim: #ffffff;
    --on-surface: #000000;
    --on-surface-variant: #333333;
    --outline: #666666;
    --outline-variant: #999999;
    --primary: #000000;
    --primary-fixed-dim: #666666;
  }

  html,
  body,
  .app-shell,
  .app-main {
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: none !important;
  }

  .app-main {
    max-width: none;
    padding: 0;
  }

  /* No navigation, no buttons, no toasts — ingredients and steps only. */
  .nav-cluster,
  .bottom-nav,
  .no-print,
  button {
    display: none !important;
  }

  .detail-quote,
  .detail-facts,
  .detail-step,
  .modal,
  .tag {
    box-shadow: none !important;
  }

  .ingredients-list li {
    break-inside: avoid;
  }

  .detail-step {
    break-inside: avoid;
  }

  /* The tick control is a button; the ingredient text has to survive it. */
  .ingredient-item {
    display: flex !important;
    padding-left: 0;
  }

  .ingredient-box {
    display: none !important;
  }

  a[href]::after {
    content: '';
  }
}
</style>
