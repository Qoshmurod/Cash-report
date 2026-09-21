<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink to="/kassa" class="brand">🏥 Klinika Kassasi</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/kassa" :class="{ active: route.path === '/kassa' }">💰 Kassa</NuxtLink>
        <NuxtLink to="/patients" :class="{ active: route.path === '/patients' }">👥 Bemorlar</NuxtLink>
      </nav>
    </header>
    <main class="content">
      <NuxtPage />
    </main>
  </div>
</template>
