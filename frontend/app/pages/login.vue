<script setup lang="ts">
import type { AuthResponse } from '~/types/api'

definePageMeta({ layout: 'auth', public: true, titleKey: 'auth.loginTitle' })

const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const route = useRoute()
const settings = useSettingsStore()
const realtime = useRealtimeStore()

const state = reactive({ login: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const errorText = ref('')

onMounted(() => settings.loadPublic())

async function submit() {
  errorText.value = ''
  if (!state.login.trim() || !state.password) {
    errorText.value = t('auth.fillAll')
    return
  }
  loading.value = true
  try {
    const res = await api.post<AuthResponse>('/auth/login', { login: state.login.trim(), password: state.password }, { toastError: false })
    auth.setSession(res)
    realtime.reconnect()
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : null
    await navigateTo(res.user.mustChangePassword ? '/change-password' : (redirect ?? auth.homePath))
  } catch (e) {
    const err = e as { code?: string; statusCode?: number }
    errorText.value =
      err.statusCode === 401 ? t('auth.invalidCredentials') : err.code === 'TOO_MANY_REQUESTS' ? t('errors.TOO_MANY_REQUESTS') : err.code === 'FORBIDDEN' ? t('auth.accountDisabled') : t('errors.NETWORK_ERROR')
  } finally {
    loading.value = false
  }
}

const features = computed(() => [
  { icon: 'i-lucide-list-ordered', title: t('auth.feature1Title'), text: t('auth.feature1Text') },
  { icon: 'i-lucide-wallet', title: t('auth.feature2Title'), text: t('auth.feature2Text') },
  { icon: 'i-lucide-chart-column', title: t('auth.feature3Title'), text: t('auth.feature3Text') },
])
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-2">
    <!-- Brand panel -->
    <aside class="relative hidden overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-sky-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div class="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-sky-300/20 blur-3xl" />
      <svg class="pointer-events-none absolute right-10 top-1/3 size-64 text-white/5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
      </svg>
      <AppLogo inverted />
      <div class="relative max-w-lg">
        <h1 class="text-4xl font-bold leading-tight tracking-tight">{{ t('auth.heroTitle') }}</h1>
        <p class="mt-4 text-lg text-white/80">{{ t('auth.heroText') }}</p>
        <ul class="mt-10 space-y-5">
          <li v-for="f in features" :key="f.title" class="flex gap-4">
            <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
              <UIcon :name="f.icon" class="size-5" />
            </span>
            <span>
              <span class="block font-semibold">{{ f.title }}</span>
              <span class="block text-sm text-white/75">{{ f.text }}</span>
            </span>
          </li>
        </ul>
      </div>
      <p class="relative text-sm text-white/60">© {{ new Date().getFullYear() }} {{ settings.hospitalName }}</p>
    </aside>

    <!-- Form -->
    <main class="flex flex-col">
      <div class="flex items-center justify-between p-4 sm:p-6">
        <AppLogo class="lg:invisible" />
        <div class="flex items-center gap-1">
          <LocaleSwitcher />
          <UColorModeButton :aria-label="t('common.theme')" />
        </div>
      </div>
      <div class="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
        <div class="w-full max-w-sm">
          <div class="mb-8">
            <h2 class="text-2xl font-bold tracking-tight text-highlighted">{{ t('auth.welcome') }}</h2>
            <p class="mt-2 text-sm text-muted">{{ t('auth.subtitle') }}</p>
          </div>
          <form class="space-y-5" novalidate @submit.prevent="submit">
            <UFormField :label="t('auth.login')" name="login" required>
              <UInput v-model="state.login" icon="i-lucide-user" size="xl" autocomplete="username" autofocus class="w-full" :placeholder="t('auth.loginPlaceholder')" />
            </UFormField>
            <UFormField :label="t('auth.password')" name="password" required>
              <UInput
                v-model="state.password"
                icon="i-lucide-lock"
                size="xl"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="w-full"
                :ui="{ trailing: 'pe-1' }"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                    :aria-pressed="showPassword"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>
            <UAlert v-if="errorText" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="errorText" />
            <UButton type="submit" size="xl" block class="justify-center" :loading="loading" :label="t('auth.signIn')" trailing-icon="i-lucide-arrow-right" />
          </form>
          <div class="mt-8 flex items-center justify-center gap-2 text-xs text-dimmed">
            <UIcon name="i-lucide-shield-check" class="size-4" />
            {{ t('auth.secureNote') }}
          </div>
          <div class="mt-4 text-center">
            <UButton to="/display" target="_blank" color="neutral" variant="link" size="sm" icon="i-lucide-monitor" :label="t('nav.display')" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
