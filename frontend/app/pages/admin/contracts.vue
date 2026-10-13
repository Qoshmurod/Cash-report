<script setup lang="ts">
definePageMeta({ sections: ['contracts'], titleKey: 'nav.contracts' })
const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.contracts')">
    <ContractsManager />
  </AppPage>
</template>
