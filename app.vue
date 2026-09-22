<script setup lang="ts">
const route = useRoute()
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/', { replace: true })
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink to="/kassa" class="brand">🏥 Klinika Kassasi</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/kassa" :class="{ active: route.path === '/kassa' }">💰 Kassa</NuxtLink>
        <NuxtLink to="/patients" :class="{ active: route.path === '/patients' }">👥 Bemorlar</NuxtLink>
        <button class="nav-logout" @click="logout">Chiqish</button>
      </nav>
    </header>
    <main class="content">
      <NuxtPage />
    </main>
  </div>
</template>
