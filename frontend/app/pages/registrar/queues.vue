<script setup lang="ts">
definePageMeta({ sections: ['queues'], titleKey: 'nav.queues' })
const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.queues')" :description="t('queues.subtitle')">
    <QueueManager />
  </AppPage>
</template>
