<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{ variant?: 'ghost' | 'outline' }>()
const { locale, locales, setLocale, t } = useI18n()

const items = computed<DropdownMenuItem[]>(() =>
  locales.value.map((l) => ({
    label: l.name ?? l.code,
    type: 'checkbox' as const,
    checked: l.code === locale.value,
    onSelect: () => void setLocale(l.code),
  })),
)
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      :variant="props.variant ?? 'ghost'"
      icon="i-lucide-languages"
      :label="locale.toUpperCase()"
      :aria-label="t('common.language')"
    />
  </UDropdownMenu>
</template>
