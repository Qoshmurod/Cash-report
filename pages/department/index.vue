<script setup lang="ts">
definePageMeta({ alias: '/admin/department' })
const { user, can } = useAuth()
const { departments } = useMeta()
const allowed = computed(() => departments.value.filter((d) => can('PAYMENTS_VIEW') || user.value?.departments.includes(d.value)))
</script>

<template>
  <div class="card">
    <h1>🧪 Laboratoriya bo‘limlari</h1>
    <div class="grid">
      <NuxtLink v-for="d in allowed" :key="d.value" :to="`/admin/department/${d.value}`" class="btn" style="text-align: center; text-decoration: none">{{ d.label }}</NuxtLink>
    </div>
    <p v-if="!allowed.length" class="muted">Sizga bo‘lim biriktirilmagan.</p>
  </div>
</template>
