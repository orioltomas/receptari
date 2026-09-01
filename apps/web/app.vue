<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'ca' },
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <NuxtLink to="/" class="brand">📖 Receptari</NuxtLink>
      <nav>
        <NuxtLink to="/recipes/new" class="nav-link">
          <i class="pi pi-plus" /> Nova recepta
        </NuxtLink>
      </nav>
    </header>
    <main class="app-main">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
:root {
  --bg: #fafafa;
  --surface: #ffffff;
  --border: #e5e7eb;
  --text: #111827;
  --muted: #6b7280;
}

.dark {
  --bg: #0b0b0b;
  --surface: #161616;
  --border: #2a2a2a;
  --text: #f5f5f5;
  --muted: #9ca3af;
}

* {
  box-sizing: border-box;
}

html,
body,
#__nuxt {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--text);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--p-primary-color, #10b981);
  color: var(--p-primary-contrast-color, #fff);
  text-decoration: none;
  font-weight: 500;
}

.nav-link:hover {
  opacity: 0.9;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
}

.page-title {
  margin: 0 0 1.5rem;
  font-size: 1.875rem;
  font-weight: 700;
}

.empty {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 8px;
}
</style>
