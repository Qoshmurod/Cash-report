<script setup lang="ts">
definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.loginHistory' })
const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.loginHistory')" :description="t('loginHistory.subtitle')">
    <LoginHistoryTable path="/login-history" show-user show-filters sync-route>
      <template #actions="{ query }">
        <ExportMenu type="login-history" :query="query" />
      </template>
    </LoginHistoryTable>
  </AppPage>
</template>
