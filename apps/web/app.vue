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

// The two destinations of the app shell. Both links use exact matching, so a
// nav entry is highlighted only on its own route: `/` would otherwise match
// every route, and the detail and edit routes are not nav destinations.
const navItems = [
  { to: '/', label: 'Cerca', icon: 'search' },
  { to: '/recipes/new', label: 'Afegir', icon: 'add_circle' },
] as const;
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header-inner">
        <NuxtLink
          to="/"
          class="app-wordmark headline-md"
          aria-label="Receptari Digital, anar a l'inici"
          title="Receptari Digital"
        >
          Receptari Digital
        </NuxtLink>

        <div class="app-header-end">
          <!-- Hidden below sm, where the floating bottom pill takes over. -->
          <nav class="header-nav" aria-label="Navegació principal">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="header-nav-link label-lg"
              exact-active-class="is-active"
              :aria-label="item.label"
              :title="item.label"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>

          <button
            class="header-theme-toggle"
            type="button"
            :aria-label="isDark ? 'Canviar a mode clar' : 'Canviar a mode fosc'"
            :title="isDark ? 'Mode clar' : 'Mode fosc'"
            @click="toggleTheme"
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{
              isDark ? 'light_mode' : 'dark_mode'
            }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <NuxtPage />
    </main>

    <!-- The design shows no navigation below sm. Following that literally would
         leave phones with no way to reach Afegir, so the floating pill stays. -->
    <nav class="bottom-nav" aria-label="Navegació principal mòbil">
      <div class="bottom-nav-pill">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="bottom-nav-link"
          exact-active-class="is-active"
          :aria-label="item.label"
          :title="item.label"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
        </NuxtLink>

        <span class="nav-divider" aria-hidden="true"></span>

        <button
          class="bottom-nav-link"
          type="button"
          :aria-label="isDark ? 'Canviar a mode clar' : 'Canviar a mode fosc'"
          :title="isDark ? 'Mode clar' : 'Mode fosc'"
          @click="toggleTheme"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{
            isDark ? 'light_mode' : 'dark_mode'
          }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>
