<script setup lang="ts">
/** Page shell inside the dashboard layout: navbar (title + global actions) and scrollable body. */
const props = defineProps<{ title: string; description?: string; icon?: string }>()
</script>

<template>
  <UDashboardPanel :id="`panel-${props.title}`">
    <template #header>
      <UDashboardNavbar :title="props.title" :icon="props.icon" :ui="{ title: 'text-base font-semibold' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <TopbarActions />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar v-if="$slots.toolbar">
        <slot name="toolbar" />
      </UDashboardToolbar>
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-[1600px]">
        <div v-if="props.description || $slots.actions" class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p v-if="props.description" class="text-sm text-muted">{{ props.description }}</p>
          <div class="flex flex-wrap items-center gap-2">
            <slot name="actions" />
          </div>
        </div>
        <slot />
      </div>
    </template>
  </UDashboardPanel>
</template>
