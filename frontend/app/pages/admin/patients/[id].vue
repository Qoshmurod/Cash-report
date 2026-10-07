<script setup lang="ts">
definePageMeta({ roles: ['ADMIN'], titleKey: 'patients.detail' })
const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <AppPage :title="t('patients.detail')">
    <PatientDetail :id="String(route.params.id)" back-to="/admin/patients" />
  </AppPage>
</template>
