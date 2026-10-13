<script setup lang="ts">
definePageMeta({ sections: ['clients', 'registration'], titleKey: 'nav.patients' })
const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.patients')">
    <PatientsList detail-base="/registrar/patients" />
  </AppPage>
</template>
