<script setup lang="ts">
definePageMeta({ roles: ['REGISTRAR', 'ADMIN'], titleKey: 'nav.payments' })
const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.payments')">
    <PaymentsList />
  </AppPage>
</template>
