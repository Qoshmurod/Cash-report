<script setup lang="ts">
const props = withDefaults(defineProps<{ title?: string; description?: string; icon?: string; compact?: boolean }>(), {
  icon: 'i-lucide-inbox',
})
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" :class="props.compact ? 'py-8' : 'py-14'">
    <div class="mb-4 grid size-12 place-items-center rounded-full bg-elevated text-muted">
      <UIcon :name="props.icon" class="size-6" />
    </div>
    <p class="font-medium text-highlighted">{{ props.title ?? t('common.empty') }}</p>
    <p v-if="props.description" class="mt-1 max-w-sm text-sm text-muted">{{ props.description }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
