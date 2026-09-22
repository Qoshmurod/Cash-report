<script setup lang="ts">
const route = useRoute()
const { language, t, languages } = useI18n()
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/', { replace: true })
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink to="/kassa" class="brand">🏥 {{ t('clinic') }}</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/kassa" :class="{ active: route.path === '/kassa' }">💰 {{ t('cash') }}</NuxtLink>
        <NuxtLink to="/patients" :class="{ active: route.path === '/patients' }">👥 {{ t('patients') }}</NuxtLink>
        <select v-model="language" class="language-select" aria-label="Language">
          <option v-for="item in languages" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <button class="nav-logout" @click="logout">{{ t('logout') }}</button>
      </nav>
    </header>
    <main class="content">
      <NuxtPage />
    </main>
  </div>
</template>
