<script setup lang="ts">
const realtime = useRealtimeStore()
const { t } = useI18n()
onMounted(() => realtime.connect())
</script>

<template>
  <UTooltip :text="realtime.connected ? t('realtime.online') : t('realtime.offline')">
    <span class="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium" :class="realtime.connected ? 'text-success' : 'text-warning'" role="status">
      <span class="relative flex size-2">
        <span v-if="realtime.connected" class="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        <span class="relative inline-flex size-2 rounded-full" :class="realtime.connected ? 'bg-success' : 'bg-warning'" />
      </span>
      <span class="hidden sm:inline">{{ realtime.connected ? t('realtime.live') : t('realtime.reconnecting') }}</span>
    </span>
  </UTooltip>
</template>
