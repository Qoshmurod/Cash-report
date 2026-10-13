<script setup lang="ts">
import type { User } from '~/types/api'

definePageMeta({ layout: 'auth', titleKey: 'password.title' })
const { t } = useI18n()
const auth = useAuthStore()
const api = useApi()
const logout = useLogout()

async function done() {
  try {
    auth.setUser(await api.get<User>('/auth/me'))
  } catch {
    if (auth.user) auth.setUser({ ...auth.user, mustChangePassword: false })
  }
  await navigateTo(auth.homePath)
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <div class="flex items-center justify-between p-4 sm:p-6">
      <AppLogo />
      <div class="flex items-center gap-1">
        <LocaleSwitcher />
        <UColorModeButton />
      </div>
    </div>
    <div class="flex flex-1 items-center justify-center px-4 pb-16">
      <UCard class="w-full max-w-md">
        <div class="mb-6 flex items-start gap-3">
          <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning">
            <UIcon name="i-lucide-shield-alert" class="size-5" />
          </div>
          <div>
            <h1 class="text-lg font-semibold text-highlighted">{{ t('password.title') }}</h1>
            <p class="text-sm text-muted">{{ auth.mustChangePassword ? t('password.forcedHint') : t('password.hint') }}</p>
          </div>
        </div>
        <PasswordChangeForm @done="done" />
        <USeparator class="my-4" />
        <UButton color="neutral" variant="ghost" icon="i-lucide-log-out" :label="t('auth.logout')" block @click="logout()" />
      </UCard>
    </div>
  </div>
</template>
