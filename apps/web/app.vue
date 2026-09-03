<script setup lang="ts">
function getInitialTheme(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const saved = localStorage.getItem('receptari-theme');
  return saved ? saved === 'dark' : false;
}

const isDark = ref(getInitialTheme());

useHead({
  htmlAttrs: {
    lang: 'ca',
    class: () => (isDark.value ? 'dark' : ''),
  },
});

function toggleTheme() {
  isDark.value = !isDark.value;
  localStorage.setItem('receptari-theme', isDark.value ? 'dark' : 'light');
}

const navItems = [
  { to: '/', label: 'Inici', icon: 'home' },
  { to: '/recipes/new', label: 'Afegir', icon: 'add_circle' },
  { to: '/cerca', label: 'Cerca', icon: 'search' },
] as const;
</script>

<template>
  <div class="app-shell">
    <nav class="nav-cluster" aria-label="Navegació principal">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-cluster-link"
        exact-active-class="is-active"
        :aria-label="item.label"
        :title="item.label"
      >
        <span class="material-symbols-outlined">{{ item.icon }}</span>
      </NuxtLink>

      <span class="nav-divider" aria-hidden="true"></span>

      <button
        class="nav-cluster-link"
        type="button"
        :aria-label="isDark ? 'Canviar a mode clar' : 'Canviar a mode fosc'"
        :title="isDark ? 'Mode clar' : 'Mode fosc'"
        @click="toggleTheme"
      >
        <span class="material-symbols-outlined">{{ isDark ? 'light_mode' : 'dark_mode' }}</span>
      </button>
    </nav>

    <main class="app-main">
      <NuxtPage />
    </main>

    <nav class="bottom-nav" aria-label="Navegació principal mòbil">
      <div class="bottom-nav-pill">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="bottom-nav-link"
          exact-active-class="is-active"
          :aria-label="item.label"
        >
          <span class="material-symbols-outlined">{{ item.icon }}</span>
        </NuxtLink>

        <span class="nav-divider" aria-hidden="true"></span>

        <button
          class="bottom-nav-link"
          type="button"
          :aria-label="isDark ? 'Canviar a mode clar' : 'Canviar a mode fosc'"
          @click="toggleTheme"
        >
          <span class="material-symbols-outlined">{{ isDark ? 'light_mode' : 'dark_mode' }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>
