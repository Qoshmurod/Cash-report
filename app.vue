<script setup lang="ts">
const route = useRoute()
const { language, t, languages } = useI18n()
const { user, refresh, navItems, can } = useAuth()
const contact = ref<Record<string, any>>({})
const showProfile = ref(false)
const profile = reactive({ username: '', currentPassword: '', newPassword: '' })
const profileError = ref('')

async function loadContact() {
  try {
    contact.value = (await $fetch<{ contact: Record<string, any> }>('/api/settings/contact')).contact
  } catch {
    contact.value = {}
  }
}

function openProfile() {
  profile.username = user.value?.username || ''
  profileError.value = ''
  showProfile.value = true
}

async function updateProfile() {
  profileError.value = ''
  try {
    await $fetch('/api/auth/profile', { method: 'POST', body: profile })
    profile.currentPassword = ''
    profile.newPassword = ''
    showProfile.value = false
    await refresh()
  } catch (error: any) {
    profileError.value = apiError(error, 'Profilni saqlab bo‘lmadi')
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  user.value = null
  await navigateTo('/', { replace: true })
}

const telegramLink = computed(() => {
  const value = contact.value.telegram?.trim()
  if (!value) return ''
  return value.startsWith('http') ? value : `https://t.me/${value.replace(/^@/, '')}`
})
const instagramLink = computed(() => {
  const value = contact.value.instagram?.trim()
  if (!value) return ''
  return value.startsWith('http') ? value : `https://instagram.com/${value.replace(/^@/, '')}`
})
const hasContact = computed(() => contact.value.enabled !== false && Boolean(contact.value.telegram || contact.value.instagram || contact.value.phone || contact.value.text))

// New version from GitHub: shown to users allowed to install it.
const update = ref<any>(null)
async function loadUpdate() {
  if (!user.value || !can('SYSTEM_UPDATE')) { update.value = null; return }
  update.value = (await $fetch<any>('/api/system/update').catch(() => null))?.update || null
}
async function requestUpdate() {
  if (!confirm(`Yangi versiya hozir o‘rnatilsinmi?\nDastur 3–8 daqiqada yangilanadi, oxirida bir necha soniya ishlamay turadi.`)) return
  try {
    await $fetch('/api/system/update', { method: 'POST' })
    await loadUpdate()
  } catch (error: any) {
    alert(apiError(error))
  }
}
watch(user, loadUpdate)
usePolling(loadUpdate, 60000)

watch(() => user.value?.mustChangePassword, (value) => { if (value) openProfile() })
provide('reloadContact', loadContact)
onMounted(loadContact)
</script>

<template>
  <div class="app-shell">
    <div v-if="hasContact" class="contact-bar">
      <span v-if="contact.text">{{ contact.text }}</span>
      <a v-if="contact.phone" :href="`tel:${contact.phone.replace(/[^\d+]/g, '')}`">📞 {{ contact.phone }}</a>
      <a v-if="telegramLink" :href="telegramLink" target="_blank" rel="noopener">✈️ Telegram: {{ contact.telegram }}</a>
      <a v-if="instagramLink" :href="instagramLink" target="_blank" rel="noopener">📷 Instagram: {{ contact.instagram }}</a>
    </div>
    <header v-if="user && route.path !== '/'" class="topbar">
      <NuxtLink :to="navItems[0]?.to || '/'" class="brand">🏥 {{ t('clinic') }}</NuxtLink>
      <nav class="nav">
        <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" :class="{ active: item.to === '/admin' ? route.path === '/admin' : route.path.startsWith(item.to) }">{{ item.icon }} {{ t(item.key) }}</NuxtLink>
      </nav>
      <div class="nav-user">
        <select v-model="language" class="language-select" aria-label="Language">
          <option v-for="item in languages" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <button class="nav-profile" @click="openProfile">⚙️ {{ user.fullName || user.username }}<small v-if="user.roleName"> · {{ user.roleName }}</small></button>
        <button class="nav-logout" @click="logout">{{ t('logout') }}</button>
      </div>
    </header>
    <div v-if="update?.available && route.path !== '/'" class="update-bar">
      <span>🆕 Yangi versiya mavjud ({{ update.count }} ta o‘zgarish<template v-if="update.commits[0]">: {{ update.commits[0].subject }}</template>).</span>
      <span v-if="update.lastFailed" class="update-error">⚠️ Oxirgi yangilanish bajarilmadi, eski versiya ishlayapti (log: /var/log/klinika-update.log).</span>
      <span v-if="update.requested">⏳ Yangilanish boshlandi, bir necha daqiqada tugaydi.</span>
      <template v-else>
        <span>Har kuni {{ update.updateTime }} da avtomatik o‘rnatiladi.</span>
        <button class="btn small" @click="requestUpdate">Hozir yangilash</button>
      </template>
    </div>
    <main :class="{ content: route.path !== '/' }">
      <NuxtPage />
    </main>
    <div v-if="showProfile" class="modal-overlay" @click.self="!user?.mustChangePassword && (showProfile = false)">
      <form class="modal" @submit.prevent="updateProfile">
        <h2>Profil va login</h2>
        <p v-if="user?.mustChangePassword" class="error">Davom etish uchun parolni almashtiring.</p>
        <div class="field"><label>Yangi login</label><input v-model="profile.username" autocomplete="username" required /></div>
        <div class="field"><label>Joriy parol</label><input v-model="profile.currentPassword" type="password" autocomplete="current-password" required /></div>
        <div class="field"><label>Yangi parol (kamida 12 belgi)</label><input v-model="profile.newPassword" type="password" minlength="12" autocomplete="new-password" required /></div>
        <p v-if="profileError" class="error">{{ profileError }}</p>
        <div class="modal-actions">
          <button v-if="!user?.mustChangePassword" type="button" class="btn secondary" @click="showProfile = false">Bekor qilish</button>
          <button class="btn" type="submit">Saqlash</button>
        </div>
      </form>
    </div>
  </div>
</template>
