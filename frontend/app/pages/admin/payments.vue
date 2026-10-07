<script setup lang="ts">
definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.payments' })
const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.payments')">
    <PaymentsList exportable />
  </AppPage>
</template>
