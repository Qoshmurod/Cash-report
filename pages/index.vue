<script setup lang="ts">
const username = ref('Husanov001')
const password = ref('Husanov001!99')
const error = ref('')
const loading = ref(false)
const { t, language, languages } = useI18n()

async function login() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { username: username.value, password: password.value } })
    await navigateTo('/kassa', { replace: true })
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Kirish amalga oshmadi'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <form class="login-card" @submit.prevent="login">
      <select v-model="language" class="language-select" aria-label="Language">
        <option v-for="item in languages" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <h1>🏥 {{ t('clinic') }}</h1>
      <p>{{ t('loginTitle') }}</p>
      <div class="demo-box">Super admin: <strong>Husanov001</strong> / <strong>Husanov001!99</strong></div>
      <label>{{ t('username') }}<input v-model="username" autocomplete="username" required /></label>
      <label>{{ t('password') }}<input v-model="password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn" :disabled="loading">{{ loading ? t('loading') : t('login') }}</button>
    </form>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f0fdfa; }
.login-card { width: min(100%, 400px); background: white; padding: 32px; border-radius: 16px; box-shadow: 0 8px 30px rgba(15, 118, 110, .12); }
.login-card h1 { margin: 0 0 8px; }
.login-card p { color: #6b7280; }
.login-card label { display: grid; gap: 6px; margin: 16px 0; font-weight: 600; }
.login-card input { padding: 11px; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; }
.login-card button { width: 100%; margin-top: 10px; }
.demo-box { margin: 10px 0 18px; padding: 10px 12px; border-radius: 8px; background: #ecfeff; color: #0f172a; font-size: 0.92rem; }
.error { color: #b91c1c !important; }
.language-select { float: right; padding: 6px; border: 1px solid #d1d5db; border-radius: 6px; }
</style>
