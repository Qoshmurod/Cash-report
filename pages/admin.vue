<script setup lang="ts">
const { data, refresh } = await useFetch('/api/admin/permissions', { server: false })
const users = computed(() => (data.value as any)?.users || [])
const permissions = computed(() => (data.value as any)?.permissions || [])
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
</script>
<template>
  <div class="card"><h1>⚙️ Administrator paneli</h1><p>Super admin xodimlarning ruxsatlarini belgilaydi.</p>
    <table class="table"><thead><tr><th>Ruxsat</th><th v-for="u in users" :key="u.id">{{ u.username }}</th></tr></thead>
      <tbody><tr v-for="p in permissions" :key="p.id"><td>{{ p.label }}</td><td v-for="u in users" :key="u.id"><input type="checkbox" :checked="has(u.id, p.id)" :disabled="u.role === 'SUPER_ADMIN'" @change="onToggle($event, u.id, p.id)" /></td></tr></tbody>
    </table>
  </div>
</template>
