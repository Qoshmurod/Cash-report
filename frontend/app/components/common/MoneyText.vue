<script setup lang="ts">
const props = withDefaults(defineProps<{ value: number | string | null | undefined; currency?: boolean; muted?: boolean }>(), {
  currency: true,
})
const { format } = useMoney()
</script>

<template>
  <span class="tabular whitespace-nowrap" :class="props.muted ? 'text-muted' : ''">{{ format(props.value, props.currency) }}</span>
</template>
