<script setup lang="ts">
const { data, refresh } = await useFetch('/api/admin/permissions', { server: false })
const { data: auditData, refresh: refreshAudit } = await useFetch('/api/admin/audit', { server: false })
const users = computed(() => (data.value as any)?.users || [])
const permissions = computed(() => (data.value as any)?.permissions || [])
const auditLogs = computed(() => (auditData.value as any)?.logs || [])
async function toggle(userId: number, permissionId: number, enabled: boolean) {
  await $fetch('/api/admin/permissions', { method: 'POST', body: { userId, permissionId, enabled } })
  await refresh()
  await refreshAudit()
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
    <h2>Audit jurnali</h2>
    <table class="table"><thead><tr><th>Vaqt</th><th>Foydalanuvchi</th><th>Amal</th><th>Obyekt</th><th>ID</th></tr></thead>
      <tbody><tr v-for="log in auditLogs" :key="log.id">
        <td>{{ new Date(log.createdAt).toLocaleString('uz-UZ') }}</td>
        <td>{{ log.user?.username || '—' }}</td><td>{{ log.action }}</td><td>{{ log.entity }}</td><td>{{ log.entityId || '—' }}</td>
      </tr><tr v-if="!auditLogs.length"><td colspan="5">Audit yozuvlari yo‘q</td></tr></tbody>
    </table>
  </div>
</template>
