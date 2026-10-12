<script setup lang="ts">
definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.patients' })
const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.patients')">
    <PatientsList detail-base="/admin/patients" exportable />
  </AppPage>
</template>
