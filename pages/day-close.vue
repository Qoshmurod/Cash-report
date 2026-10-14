<script setup lang="ts">
const { user } = useAuth()
const { departments, methods, depLabel, methodLabel } = useMeta()
const date = ref(todayString())
const data = ref<any>(null)
const selected = ref<number[]>([])
const filter = reactive({ method: 'ALL', department: 'ALL', contractId: 'ALL' })
const note = ref('')

async function load() {
  try {
    data.value = await $fetch('/api/day-close', { query: { date: date.value } })
    selected.value = data.value.payments.map((p: any) => p.id)
  } catch (e: any) {
    alert(apiError(e))
  }
}
const contracts = computed(() => {
  const map = new Map<number, any>()
  for (const p of data.value?.payments || []) if (p.contract) map.set(p.contract.id, p.contract)
  return [...map.values()]
})
const visible = computed(() => (data.value?.payments || []).filter((p: any) =>
  (filter.method === 'ALL' || p.method === filter.method) &&
  (filter.department === 'ALL' || p.department === filter.department) &&
  (filter.contractId === 'ALL' || String(p.contractId) === filter.contractId)))
const chosen = computed(() => (data.value?.payments || []).filter((p: any) => selected.value.includes(p.id)))
const sum = (list: any[]) => list.reduce((total, p) => total + p.amount, 0)
const byMethod = (list: any[]) => methods.value.map((m) => ({ ...m, total: sum(list.filter((p) => p.method === m.value)) })).filter((m) => m.total)

function selectVisible(on: boolean) {
  const ids = visible.value.map((p: any) => p.id)
  selected.value = on ? [...new Set([...selected.value, ...ids])] : selected.value.filter((id) => !ids.includes(id))
}
async function exportSelected() {
  if (!selected.value.length) return alert('Kamida bitta to‘lovni tanlang')
  try {
    await downloadBlob('/api/day-close/export', { date: date.value, ids: selected.value }, `kun-${date.value}.xlsx`)
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function closeDay() {
  if (!confirm(`${date.value} kunini yopasizmi? Yopilgandan keyin bu kundagi to‘lovlarni o‘zgartirib bo‘lmaydi.`)) return
  try {
    await $fetch('/api/day-close', { method: 'POST', body: { date: date.value, note: note.value } })
    note.value = ''
    await load()
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function reopen() {
  if (!confirm('Kunni qayta ochasizmi?')) return
  await $fetch(`/api/day-close/${date.value}`, { method: 'DELETE' }).catch((e) => alert(apiError(e)))
  await load()
}
const services = (p: any) => [...(p.paymentServices || []).map((item: any) => item.service.name), p.service].filter(Boolean).join(', ') || '—'
watch(date, load)
onMounted(load)
</script>

<template>
  <div v-if="data">
    <div class="card">
      <div class="page-header">
        <h1>🔒 Kunni yopish</h1>
        <input v-model="date" type="date" />
      </div>
      <div v-if="data.closure" class="closed">
        ✅ <strong>{{ data.date }}</strong> kuni yopilgan: {{ data.closure.count }} ta to‘lov, {{ formatSum(data.closure.total) }}.
        Yopgan: {{ data.closure.closedByName }}, {{ formatDate(data.closure.createdAt) }}. {{ data.closure.note }}
        <button v-if="user?.isSuperAdmin" class="btn warn small" @click="reopen">Qayta ochish</button>
      </div>
      <div class="grid">
        <div class="field"><label>To‘lov turi</label><select v-model="filter.method"><option value="ALL">Barchasi</option><option v-for="m in methods" :key="m.value" :value="m.value">{{ m.label }}</option></select></div>
        <div class="field"><label>Bo‘lim</label><select v-model="filter.department"><option value="ALL">Barchasi</option><option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option></select></div>
        <div class="field"><label>Shartnoma</label><select v-model="filter.contractId"><option value="ALL">Barchasi</option><option v-for="c in contracts" :key="c.id" :value="String(c.id)">№{{ c.number }} {{ c.organization }}</option></select></div>
        <div class="row">
          <button class="btn secondary small" @click="selectVisible(true)">☑ Ko‘rinayotganlarni tanlash</button>
          <button class="btn secondary small" @click="selectVisible(false)">☐ Bekor qilish</button>
        </div>
      </div>
      <p>
        Kun bo‘yicha: <strong>{{ data.payments.length }} ta, {{ formatSum(sum(data.payments)) }}</strong> ·
        Tanlangan: <strong>{{ chosen.length }} ta, {{ formatSum(sum(chosen)) }}</strong>
        <span v-for="m in byMethod(chosen)" :key="m.value" class="badge">{{ m.label }}: {{ formatSum(m.total) }}</span>
      </p>
      <div class="row">
        <button class="btn" @click="exportSelected">📊 Tanlanganlarni Excelga yuklash</button>
        <template v-if="!data.closure">
          <input v-model="note" placeholder="Izoh (ixtiyoriy)" style="padding: 8px; min-width: 240px" />
          <button class="btn warn" @click="closeDay">🔒 Kunni yopish</button>
        </template>
      </div>
    </div>
    <div class="card table-wrap">
      <table class="table">
        <thead><tr><th /><th>#</th><th>Vaqt</th><th>Bemor</th><th>Bo‘lim</th><th>Xizmat</th><th>Turi</th><th>Summa</th><th>Kassir</th></tr></thead>
        <tbody>
          <tr v-for="p in visible" :key="p.id">
            <td><input v-model="selected" type="checkbox" :value="p.id" /></td>
            <td>{{ p.id }}</td>
            <td>{{ formatDate(p.createdAt) }}</td>
            <td>{{ p.patient.fullName }}</td>
            <td>{{ depLabel(p.department) }}</td>
            <td>{{ services(p) }}</td>
            <td>{{ methodLabel(p.method) }}<div v-if="p.contract" class="muted">№{{ p.contract.number }}</div></td>
            <td><strong>{{ formatSum(p.amount) }}</strong></td>
            <td>{{ p.createdBy?.fullName || p.createdBy?.username || '—' }}</td>
          </tr>
          <tr v-if="!visible.length"><td colspan="9" class="empty">To‘lovlar yo‘q</td></tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <h2>Oxirgi yopilgan kunlar</h2>
      <table class="table">
        <thead><tr><th>Sana</th><th>Soni</th><th>Jami</th><th>Yopgan</th></tr></thead>
        <tbody><tr v-for="c in data.recent" :key="c.id"><td>{{ c.date }}</td><td>{{ c.count }}</td><td>{{ formatSum(c.total) }}</td><td>{{ c.closedByName }}</td></tr></tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.closed { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; margin-bottom: 14px; }
</style>
