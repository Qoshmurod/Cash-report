<script setup lang="ts">
const props = defineProps<{ label: string; value?: string | number | null; icon?: string }>()
</script>

<template>
  <div class="flex items-start justify-between gap-4 py-2 text-sm">
    <span class="flex items-center gap-2 text-muted">
      <UIcon v-if="props.icon" :name="props.icon" class="size-4" />
      {{ props.label }}
    </span>
    <span class="text-right font-medium text-highlighted">
      <slot>{{ props.value ?? '—' }}</slot>
    </span>
  </div>
</template>
