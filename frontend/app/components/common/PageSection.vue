<script setup lang="ts">
const props = defineProps<{ title?: string; description?: string; icon?: string }>()
</script>

<template>
  <UCard :ui="{ header: 'px-4 py-3 sm:px-5', body: 'p-4 sm:p-5' }">
    <template v-if="props.title || $slots.actions" #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon v-if="props.icon" :name="props.icon" class="size-4 text-muted" />
          <div class="min-w-0">
            <h3 class="truncate font-semibold text-highlighted">{{ props.title }}</h3>
            <p v-if="props.description" class="text-xs text-muted">{{ props.description }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <slot />
  </UCard>
</template>
