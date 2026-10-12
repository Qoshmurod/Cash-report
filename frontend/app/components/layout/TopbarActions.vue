<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-1">
    <RealtimeIndicator />
    <LocaleSwitcher />
    <UColorModeButton :aria-label="t('common.theme')" />
  </div>
</template>
