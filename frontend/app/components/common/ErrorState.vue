<script setup lang="ts">
import type { ApiError } from '~/utils/api-error'

const props = defineProps<{ error?: ApiError | null; compact?: boolean }>()
const emit = defineEmits<{ retry: [] }>()
const { t, te } = useI18n()

const message = computed(() => {
  const code = props.error?.code
  if (code && te(`errors.${code}`)) return t(`errors.${code}`)
  return t('errors.INTERNAL_ERROR')
})
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" :class="props.compact ? 'py-8' : 'py-14'" role="alert">
    <div class="mb-4 grid size-12 place-items-center rounded-full bg-error/10 text-error">
      <UIcon name="i-lucide-cloud-off" class="size-6" />
    </div>
    <p class="font-medium text-highlighted">{{ t('common.loadError') }}</p>
    <p class="mt-1 max-w-sm text-sm text-muted">{{ message }}</p>
    <UButton class="mt-4" color="neutral" variant="outline" icon="i-lucide-refresh-cw" :label="t('common.retry')" @click="emit('retry')" />
  </div>
</template>
