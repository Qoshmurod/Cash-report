<script setup lang="ts">
definePageMeta({ alias: '/admin/audit' })
const filter = reactive({ from: '', to: '', search: '', entity: '' })
const data = ref<any>(null)
const tab = ref('audit')
const entities: Record<string, string> = {
  payment: 'To‘lov', patient: 'Bemor', staff: 'Xodim', permission: 'Ruxsat', service: 'Xizmat', doctor: 'Shifokor',
  contract: 'Shartnoma', 'contract-client': 'Shartnoma mijozi', 'guarantee-letter': 'Kafolat xati', 'day-close': 'Kunni yopish'
}
async function load() {
  const query = Object.fromEntries(Object.entries(filter).filter(([, value]) => value))
  data.value = await $fetch('/api/audit', { query }).catch((e) => { alert(apiError(e)); return null })
}
onMounted(load)
</script>

<template>
  <div class="card">
    <h1>📜 Audit jurnali</h1>
    <p class="muted">Xodimlarning barcha muhim amallari va kirishlari. Super admin amallari saqlanmaydi.</p>
    <div class="grid">
      <div class="field"><label>Dan</label><input v-model="filter.from" type="date" /></div>
      <div class="field"><label>Gacha</label><input v-model="filter.to" type="date" /></div>
      <div class="field"><label>Bo‘lim</label><select v-model="filter.entity"><option value="">Barchasi</option><option v-for="(label, key) in entities" :key="key" :value="key">{{ label }}</option></select></div>
      <div class="field"><label>Qidirish</label><input v-model="filter.search" placeholder="Login yoki matn" /></div>
      <div class="field"><button class="btn secondary" @click="load">🔍 Filtrlash</button></div>
    </div>
    <div class="tabs">
      <button :class="{ active: tab === 'audit' }" @click="tab = 'audit'">Amallar ({{ data?.total || 0 }})</button>
      <button :class="{ active: tab === 'logins' }" @click="tab = 'logins'">Kirish tarixi</button>
    </div>
    <div v-if="data" class="table-wrap">
      <table v-if="tab === 'audit'" class="table">
        <thead><tr><th>Vaqt</th><th>Xodim</th><th>Bo‘lim</th><th>Amal</th><th>Tafsilot</th><th>IP</th></tr></thead>
        <tbody>
          <tr v-for="log in data.logs" :key="log.id">
            <td>{{ formatDate(log.createdAt) }}</td><td>{{ log.username }}</td><td>{{ entities[log.entity] || log.entity }}</td>
            <td><span class="badge">{{ log.action }}</span></td><td>{{ log.summary }}</td><td class="muted">{{ log.ip }}</td>
          </tr>
          <tr v-if="!data.logs.length"><td colspan="6" class="empty">Yozuvlar yo‘q</td></tr>
        </tbody>
      </table>
      <table v-else class="table">
        <thead><tr><th>Vaqt</th><th>Login</th><th>Hodisa</th><th>IP</th></tr></thead>
        <tbody>
          <tr v-for="l in data.logins" :key="l.id"><td>{{ formatDate(l.createdAt) }}</td><td>{{ l.username }}</td><td><span class="badge" :class="l.type === 'FAILED' ? 'red' : 'green'">{{ l.type }}</span></td><td>{{ l.ip }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
