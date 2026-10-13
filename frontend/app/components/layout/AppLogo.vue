<script setup lang="ts">
const props = defineProps<{ collapsed?: boolean; inverted?: boolean }>()
const settings = useSettingsStore()
const { t } = useI18n()
</script>

<template>
  <div class="flex min-w-0 items-center gap-2.5">
    <div class="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary text-inverted shadow-sm">
      <img v-if="settings.publicSettings.logo" :src="settings.publicSettings.logo" alt="" class="size-full object-cover" >
      <UIcon v-else name="i-lucide-hospital" class="size-5" />
    </div>
    <div v-if="!props.collapsed" class="min-w-0 leading-tight">
      <p class="truncate text-sm font-semibold" :class="props.inverted ? 'text-white' : 'text-highlighted'">{{ settings.hospitalName }}</p>
      <p class="truncate text-xs" :class="props.inverted ? 'text-white/70' : 'text-muted'">{{ t('app.tagline') }}</p>
    </div>
  </div>
</template>
