<script setup lang="ts">
const { data, refresh } = await useFetch('/api/admin/permissions', { server: false })
const users = computed(() => (data.value as any)?.users || [])
const permissions = computed(() => (data.value as any)?.permissions || [])
const { data: departments } = await useFetch('/api/departments', { server: false })
const { data: services, refresh: refreshServices } = await useFetch('/api/services', { server: false })
const departmentList = computed(() => (departments.value as any)?.departments || [])
const serviceList = computed(() => (services.value as any)?.services || [])
const serviceDraft = reactive<Record<number, number>>({})
async function toggle(userId: number, permissionId: number, enabled: boolean) {
  await $fetch('/api/admin/permissions', { method: 'POST', body: { userId, permissionId, enabled } })
  await refresh()
}
function has(userId: number, permissionId: number) {
  return (data.value as any)?.permissions?.find((p: any) => p.id === permissionId)?.users.some((u: any) => u.userId === userId)
}
function onToggle(event: Event, userId: number, permissionId: number) {
  toggle(userId, permissionId, (event.target as HTMLInputElement).checked)
}
async function saveService(service: any) {
  await $fetch(`/api/services/${service.id}`, { method: 'PATCH', body: { price: Number(serviceDraft[service.id] ?? service.price), active: service.active } })
  await refreshServices()
}
</script>
<template>
  <div class="card"><h1>⚙️ Administrator paneli</h1><p>Ruxsatlar, bo‘limlar va xizmat narxlarini boshqaring.</p>
    <table class="table"><thead><tr><th>Ruxsat</th><th v-for="u in users" :key="u.id">{{ u.username }}</th></tr></thead>
      <tbody><tr v-for="p in permissions" :key="p.id"><td>{{ p.label }}</td><td v-for="u in users" :key="u.id"><input type="checkbox" :checked="has(u.id, p.id)" :disabled="u.role === 'SUPER_ADMIN'" @change="onToggle($event, u.id, p.id)" /></td></tr></tbody>
    </table>
    <h2>Bo‘limlar</h2>
    <div class="admin-departments"><span v-for="department in departmentList" :key="department.id">{{ department.name }}</span></div>
    <h2>Xizmatlar va narxlar</h2>
    <table class="table"><thead><tr><th>Xizmat</th><th>Bo‘lim</th><th>Narx</th><th>Faol</th><th></th></tr></thead>
      <tbody><tr v-for="service in serviceList" :key="service.id"><td>{{ service.name }}</td><td>{{ service.departmentRef?.name || service.department }}</td><td><input v-model="serviceDraft[service.id]" type="number" min="0" :placeholder="String(service.price)" /></td><td><input v-model="service.active" type="checkbox" /></td><td><button class="btn small" @click="saveService(service)">Saqlash</button></td></tr></tbody>
    </table>
  </div>
</template>
