<script setup lang="ts">
import { ALL_FILTER } from '~/utils/constants'

/** Select for optional list filters: "All" maps to `undefined`. */
const props = defineProps<{
  items: { value: string; label: string }[]
  placeholder?: string
  icon?: string
  allLabel?: string
}>()
const model = defineModel<string | undefined>()
const { t } = useI18n()

const options = computed(() => [{ value: ALL_FILTER, label: props.allLabel ?? t('common.all') }, ...props.items])
const inner = computed({
  get: () => model.value ?? ALL_FILTER,
  set: (v: string) => {
    model.value = v === ALL_FILTER ? undefined : v
  },
})
</script>

<template>
  <USelect v-model="inner" :items="options" :icon="props.icon" :placeholder="props.placeholder" class="min-w-40" />
</template>
