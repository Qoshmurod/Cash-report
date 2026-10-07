<script setup lang="ts">
import type { SortOrder } from '~/types/api'

const props = defineProps<{ label: string; column: string; sortBy: string; sortOrder: SortOrder }>()
const emit = defineEmits<{ sort: [string] }>()
const active = computed(() => props.sortBy === props.column)
const icon = computed(() =>
  !active.value ? 'i-lucide-arrow-up-down' : props.sortOrder === 'ASC' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow',
)
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    size="xs"
    :label="props.label"
    :trailing-icon="icon"
    class="-mx-2 text-xs font-medium uppercase tracking-wide"
    :class="active ? 'text-highlighted' : 'text-muted'"
    :aria-sort="active ? (props.sortOrder === 'ASC' ? 'ascending' : 'descending') : 'none'"
    @click="emit('sort', props.column)"
  />
</template>
