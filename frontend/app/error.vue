<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const auth = useAuthStore()
const is404 = computed(() => props.error.statusCode === 404)

function goHome() {
  clearError({ redirect: auth.isAuthenticated ? auth.homePath : '/login' })
}
</script>

<template>
  <UApp>
    <div class="min-h-screen grid place-items-center p-6">
      <div class="text-center max-w-md">
        <div class="mx-auto mb-6 size-16 rounded-2xl bg-primary/10 text-primary grid place-items-center">
          <UIcon :name="is404 ? 'i-lucide-map-pin-off' : 'i-lucide-triangle-alert'" class="size-8" />
        </div>
        <p class="text-6xl font-bold text-highlighted tabular">{{ error.statusCode }}</p>
        <h1 class="mt-3 text-xl font-semibold text-highlighted">
          {{ is404 ? t('errorPage.notFound') : t('errorPage.generic') }}
        </h1>
        <p class="mt-2 text-muted">{{ t('errorPage.hint') }}</p>
        <UButton class="mt-6" icon="i-lucide-house" :label="t('errorPage.home')" @click="goHome" />
      </div>
    </div>
  </UApp>
</template>
