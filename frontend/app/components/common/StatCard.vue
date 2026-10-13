<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    icon: string
    color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
    hint?: string
    loading?: boolean
    to?: string
  }>(),
  { color: 'primary' },
)

const tone: Record<NonNullable<typeof props.color>, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  neutral: 'bg-elevated text-muted',
}
</script>

<template>
  <component
    :is="props.to ? resolveComponent('NuxtLink') : 'div'"
    :to="props.to"
    class="group block rounded-xl border border-default bg-default p-4 transition hover:border-accented sm:p-5"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-muted">{{ props.label }}</p>
        <USkeleton v-if="props.loading" class="mt-2 h-8 w-24" />
        <p v-else class="mt-1 truncate text-2xl font-semibold tracking-tight text-highlighted tabular">{{ props.value }}</p>
        <p v-if="props.hint && !props.loading" class="mt-1 truncate text-xs text-dimmed">{{ props.hint }}</p>
      </div>
      <div class="grid size-10 shrink-0 place-items-center rounded-lg" :class="tone[props.color]">
        <UIcon :name="props.icon" class="size-5" />
      </div>
    </div>
  </component>
</template>
