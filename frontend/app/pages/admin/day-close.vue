<script setup lang="ts">
definePageMeta({ sections: ['day_close'], titleKey: 'nav.dayClose' })
const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.dayClose')">
    <DayClosePanel payments-path="/admin/payments" />
  </AppPage>
</template>
