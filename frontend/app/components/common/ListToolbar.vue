<script setup lang="ts">
const props = defineProps<{ searchPlaceholder?: string; activeFilters?: number; hideSearch?: boolean }>()
const search = defineModel<string>('search', { default: '' })
const emit = defineEmits<{ reset: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex flex-1 flex-wrap items-center gap-2">
      <UInput
        v-if="!props.hideSearch"
        v-model="search"
        icon="i-lucide-search"
        :placeholder="props.searchPlaceholder ?? t('common.search')"
        class="w-full sm:w-72"
        :aria-label="t('common.search')"
      >
        <template v-if="search" #trailing>
          <UButton color="neutral" variant="link" size="xs" icon="i-lucide-x" :aria-label="t('common.clear')" @click="search = ''" />
        </template>
      </UInput>
      <slot name="filters" />
      <UButton
        v-if="(props.activeFilters ?? 0) > 0 || search"
        color="neutral"
        variant="ghost"
        icon="i-lucide-filter-x"
        :label="t('common.resetFilters')"
        @click="emit('reset')"
      />
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
