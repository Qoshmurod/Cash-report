<script setup lang="ts">
import * as uiLocales from '@nuxt/ui/locale'

const { locale, t } = useI18n()
const route = useRoute()
const settings = useSettingsStore()

const UI_LOCALES = { uz: uiLocales.uz, ru: uiLocales.ru, en: uiLocales.en, tr: uiLocales.tr } as const
const uiLocale = computed(() => UI_LOCALES[locale.value as keyof typeof UI_LOCALES] ?? uiLocales.uz)

useHead({
  htmlAttrs: { lang: () => locale.value },
  titleTemplate: (title) => (title ? `${title} · ${settings.hospitalName}` : settings.hospitalName),
  title: () => (route.meta.titleKey ? t(route.meta.titleKey) : ''),
})
</script>

<template>
  <UApp :locale="uiLocale" :toaster="{ position: 'top-right', duration: 4000 }">
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
