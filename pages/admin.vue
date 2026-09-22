<script setup lang="ts">
const { data, refresh } = await useFetch('/api/admin/permissions', { server: false })
async function toggle(userId: number, permissionId: number, enabled: boolean) {
  await $fetch('/api/admin/permissions', { method: 'POST', body: { userId, permissionId, enabled } })
  await refresh()
}
function has(userId: number, permissionId: number) {
  return (data.value as any)?.permissions?.find((p: any) => p.id === permissionId)?.users.some((u: any) => u.userId === userId)
}
</script>
<template>
  <div class="card"><h1>⚙️ Administrator paneli</h1><p>Super admin xodimlarning ruxsatlarini belgilaydi.</p>
    <table class="table"><thead><tr><th>Ruxsat</th><th v-for="u in (data as any)?.users || []" :key="u.id">{{ u.username }}</th></tr></thead>
      <tbody><tr v-for="p in (data as any)?.permissions || []" :key="p.id"><td>{{ p.label }}</td><td v-for="u in (data as any)?.users || []" :key="u.id"><input type="checkbox" :checked="has(u.id, p.id)" :disabled="u.role === 'SUPER_ADMIN'" @change="toggle(u.id, p.id, ($event.target as HTMLInputElement).checked)" /></td></tr></tbody>
    </table>
  </div>
</template>
