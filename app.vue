<script setup lang="ts">
const route = useRoute()
const { language, t, languages } = useI18n()
const user = ref<{ username?: string } | null>(null)
const showProfile = ref(false)
const profile = reactive({ username: '', currentPassword: '', newPassword: '' })
const profileError = ref('')
const profileSaved = ref(false)

async function loadUser() {
  try {
    const result: any = await $fetch('/api/auth/me')
    user.value = result.user
    profile.username = result.user.username
  } catch {
    user.value = null
  }
}

async function updateProfile() {
  profileError.value = ''
  profileSaved.value = false
  try {
    await $fetch('/api/auth/profile', { method: 'POST', body: profile })
    profileSaved.value = true
    profile.currentPassword = ''
    profile.newPassword = ''
    showProfile.value = false
    await loadUser()
  } catch (error: any) {
    profileError.value = error.data?.statusMessage || 'Profilni saqlab bo‘lmadi'
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/', { replace: true })
}

onMounted(loadUser)
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
        <button class="nav-profile" @click="showProfile = true">⚙️ {{ user?.username }}</button>
        <button class="nav-logout" @click="logout">{{ t('logout') }}</button>
      </nav>
    </header>
    <main class="content">
      <NuxtPage />
    </main>
    <div v-if="showProfile" class="profile-overlay" @click.self="showProfile = false">
      <form class="profile-modal" @submit.prevent="updateProfile">
        <h2>Profil va login</h2>
        <label>Yangi login<input v-model="profile.username" autocomplete="username" required /></label>
        <label>Joriy parol<input v-model="profile.currentPassword" type="password" autocomplete="current-password" required /></label>
        <label>Yangi parol<input v-model="profile.newPassword" type="password" minlength="12" autocomplete="new-password" required /></label>
        <p class="profile-hint">Yangi parol kamida 12 belgidan iborat bo‘lsin.</p>
        <p v-if="profileError" class="profile-error">{{ profileError }}</p>
        <div class="profile-actions">
          <button type="button" class="btn secondary" @click="showProfile = false">Bekor qilish</button>
          <button class="btn" type="submit">Saqlash</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.nav-profile { border: 0; background: transparent; color: inherit; cursor: pointer; }
.profile-overlay { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgba(0,0,0,.5); }
.profile-modal { width: min(100%, 440px); padding: 24px; border-radius: 14px; background: white; }
.profile-modal label { display: grid; gap: 6px; margin: 14px 0; font-weight: 600; }
.profile-modal input { padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; }
.profile-hint { color: #6b7280; font-size: .9rem; }
.profile-error { color: #b91c1c; }
.profile-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
</style>
