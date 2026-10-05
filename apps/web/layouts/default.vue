<template>
<div class="shell">
  <header class="top">
    <div class="brand">🧪 Clinika / LabMed</div>
    <div class="row"><span class="muted">{{ auth.user?.name }}</span><button class="btn danger" @click="auth.logout()">Chiqish</button></div>
  </header>
  <div class="layout">
    <aside class="side">
      <NuxtLink to="/">🏠 <span>Bosh sahifa</span></NuxtLink>
      <NuxtLink v-if="auth.can('kassa_access')" to="/kassa">💳 <span>Kassa</span></NuxtLink>
      <NuxtLink v-if="auth.can('cashier_access')" to="/cashier">🧾 <span>To‘lovlar</span></NuxtLink>
      <NuxtLink v-if="auth.can('service_provision_access')" to="/provision">🧪 <span>Xizmatlar</span></NuxtLink>
      <NuxtLink v-if="auth.can('patient_access')" to="/patients">👥 <span>Mijozlar</span></NuxtLink>
      <NuxtLink v-if="auth.can('report_view')" to="/reports">📊 <span>Hisobot</span></NuxtLink>
      <NuxtLink v-if="auth.can('user_access')" to="/admin">⚙ <span>Boshqaruv</span></NuxtLink>
    </aside>
    <main class="main"><slot /></main>
  </div>
</div>
</template>
<script setup lang="ts">
const auth = useAuthStore()
</script>
