<script setup lang="ts">
definePageMeta({ alias: '/admin/day-close' })
const { user } = useAuth()
const { departments, methods, depLabel, methodLabel } = useMeta()
const date = ref(todayString())
const data = ref<any>(null)
const filter = reactive({ method: 'ALL', department: 'ALL', contractId: 'ALL' })
const note = ref('')
// key = "paymentId:serviceId" ("paymentId:-" for a payment without catalog services / extra service text)
const selected = reactive<Record<string, boolean>>({})
const amounts = reactive<Record<string, number>>({})

type Line = { key: string; paymentId: number; serviceId: number | null; label: string; suggested: number }

// Splits a payment into the lines that can be confirmed separately at day close.
function linesOf(p: any): Line[] {
  const services: Line[] = (p.paymentServices || []).map((ps: any) => ({
    key: `${p.id}:${ps.serviceId}`, paymentId: p.id, serviceId: ps.serviceId, label: ps.service.name, suggested: ps.amount || ps.service.price || 0
  }))
  const priced = services.reduce((sum, line) => sum + line.suggested, 0)
  if (services.length === 1 && !p.service) services[0]!.suggested = p.amount
  else if (services.length && priced === 0 && !p.service) services.forEach((line) => { line.suggested = 0 })
  const lines = [...services]
  if (p.service || !services.length) {
    lines.push({ key: `${p.id}:-`, paymentId: p.id, serviceId: null, label: p.service || 'To‘lov (xizmat ko‘rsatilmagan)', suggested: services.length ? Math.max(0, p.amount - priced) : p.amount })
  }
  return lines
}

async function load() {
  try {
    data.value = await $fetch('/api/day-close', { query: { date: date.value } })
    for (const key of Object.keys(selected)) delete selected[key]
    for (const key of Object.keys(amounts)) delete amounts[key]
    const confirmed = new Map<string, number>((data.value.closure?.items || []).map((item: any) => [`${item.paymentId}:${item.serviceId ?? '-'}`, item.amount]))
    for (const p of data.value.payments) {
      for (const line of linesOf(p)) {
        selected[line.key] = data.value.closure ? confirmed.has(line.key) : false
        amounts[line.key] = confirmed.get(line.key) ?? line.suggested
      }
    }
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
const allLines = computed(() => (data.value?.payments || []).flatMap((p: any) => linesOf(p).map((line) => ({ ...line, method: p.method }))))
const chosen = computed(() => allLines.value.filter((line: any) => selected[line.key]))
const chosenSum = computed(() => chosen.value.reduce((sum: number, line: any) => sum + (Number(amounts[line.key]) || 0), 0))
const dayTotal = computed(() => (data.value?.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0))
const byMethod = computed(() => methods.value
  .map((m) => ({ ...m, total: chosen.value.filter((line: any) => line.method === m.value).reduce((sum: number, line: any) => sum + (Number(amounts[line.key]) || 0), 0) }))
  .filter((m) => m.total))
const closed = computed(() => Boolean(data.value?.closure))

const paymentChecked = (p: any) => linesOf(p).every((line) => selected[line.key])
const paymentPartial = (p: any) => !paymentChecked(p) && linesOf(p).some((line) => selected[line.key])
const paymentSelectedSum = (p: any) => linesOf(p).filter((line) => selected[line.key]).reduce((sum, line) => sum + (Number(amounts[line.key]) || 0), 0)
const overLimit = (p: any) => paymentSelectedSum(p) > p.amount
function togglePayment(p: any, on: boolean) {
  for (const line of linesOf(p)) selected[line.key] = on
}
function selectVisible(on: boolean) {
  for (const p of visible.value) togglePayment(p, on)
}
const payload = () => chosen.value.map((line: any) => ({ paymentId: line.paymentId, serviceId: line.serviceId, amount: Number(amounts[line.key]) || 0 }))

async function exportSelected() {
  if (!chosen.value.length) return alert('Kamida bitta xizmatni tanlang')
  try {
    await downloadBlob('/api/day-close/export', { date: date.value, items: payload() }, `kun-${date.value}.xlsx`)
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function closeDay() {
  if (visible.value.some(overLimit)) return alert('Ba’zi to‘lovlarda tanlangan summa to‘lov summasidan oshib ketgan')
  if (!confirm(`${date.value} kunini yopasizmi?\nKassaga tushgan: ${formatSum(chosenSum.value)} (${chosen.value.length} ta xizmat).\nYopilgandan keyin bu kundagi to‘lovlarni o‘zgartirib bo‘lmaydi.`)) return
  try {
    await $fetch('/api/day-close', { method: 'POST', body: { date: date.value, note: note.value, items: payload() } })
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
      <p class="muted">Kassaga haqiqatda tushgan to‘lovlarni belgilang. Bir nechta xizmat uchun to‘lagan mijozda faqat puli tushgan xizmatlarni tanlash va summani tuzatish mumkin. Kun faqat tanlangan qatorlar bilan yopiladi.</p>
      <div v-if="closed" class="closed">
        ✅ <strong>{{ data.date }}</strong> kuni yopilgan: kassaga {{ formatSum(data.closure.total) }} ({{ data.closure.items.length }} ta xizmat, {{ data.closure.count }} ta to‘lov).
        Yopgan: {{ data.closure.closedByName }}, {{ formatDate(data.closure.createdAt) }}. {{ data.closure.note }}
        <button v-if="user?.isSuperAdmin" class="btn warn small" @click="reopen">Qayta ochish</button>
      </div>
      <div class="grid">
        <div class="field"><label>To‘lov turi</label><select v-model="filter.method"><option value="ALL">Barchasi</option><option v-for="m in methods" :key="m.value" :value="m.value">{{ m.label }}</option></select></div>
        <div class="field"><label>Bo‘lim</label><select v-model="filter.department"><option value="ALL">Barchasi</option><option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option></select></div>
        <div class="field"><label>Shartnoma</label><select v-model="filter.contractId"><option value="ALL">Barchasi</option><option v-for="c in contracts" :key="c.id" :value="String(c.id)">№{{ c.number }} {{ c.organization }}</option></select></div>
        <div v-if="!closed" class="row">
          <button class="btn secondary small" @click="selectVisible(true)">☑ Ko‘rinayotganlarni to‘liq tanlash</button>
          <button class="btn secondary small" @click="selectVisible(false)">☐ Tanlovni bekor qilish</button>
        </div>
      </div>
      <div class="summary">
        <div>Kun bo‘yicha to‘lovlar: <strong>{{ data.payments.length }} ta, {{ formatSum(dayTotal) }}</strong></div>
        <div>Kassaga tushgan (tanlangan): <strong class="green">{{ formatSum(chosenSum) }}</strong> — {{ chosen.length }} ta xizmat</div>
        <div>Farq: <strong :class="dayTotal - chosenSum ? 'red' : ''">{{ formatSum(dayTotal - chosenSum) }}</strong></div>
        <div><span v-for="m in byMethod" :key="m.value" class="badge">{{ m.label }}: {{ formatSum(m.total) }}</span></div>
      </div>
      <div class="row">
        <button class="btn" @click="exportSelected">📊 Tanlanganlarni Excelga yuklash</button>
        <template v-if="!closed">
          <input v-model="note" placeholder="Izoh (ixtiyoriy)" style="padding: 8px; min-width: 240px" />
          <button class="btn warn" @click="closeDay">🔒 Tanlanganlar bilan kunni yopish</button>
        </template>
      </div>
    </div>

    <div class="card table-wrap">
      <table class="table">
        <thead><tr><th style="width: 36px" /><th>#</th><th>Vaqt</th><th>Bemor</th><th>Xizmatlar (kassaga tushganini belgilang)</th><th>Turi</th><th>To‘lov summasi</th><th>Tanlangan</th></tr></thead>
        <tbody>
          <tr v-for="p in visible" :key="p.id" :class="{ partial: paymentPartial(p) }">
            <td><input type="checkbox" :checked="paymentChecked(p)" :indeterminate.prop="paymentPartial(p)" :disabled="closed" @change="togglePayment(p, ($event.target as HTMLInputElement).checked)" /></td>
            <td>{{ p.id }}</td>
            <td>{{ formatDate(p.createdAt) }}</td>
            <td><strong>{{ p.patient.fullName }}</strong><div class="muted">{{ depLabel(p.department) }} · {{ p.createdBy?.fullName || p.createdBy?.username || '' }}</div></td>
            <td>
              <div v-for="line in linesOf(p)" :key="line.key" class="line" :class="{ off: !selected[line.key] }">
                <label><input v-model="selected[line.key]" type="checkbox" :disabled="closed" /> {{ line.label }}</label>
                <input v-model.number="amounts[line.key]" type="number" min="0" class="amount" :disabled="closed || !selected[line.key]" />
              </div>
            </td>
            <td>{{ methodLabel(p.method) }}<div v-if="p.contract" class="muted">№{{ p.contract.number }}</div></td>
            <td><strong>{{ formatSum(p.amount) }}</strong></td>
            <td><strong :class="overLimit(p) ? 'red' : 'green'">{{ formatSum(paymentSelectedSum(p)) }}</strong><div v-if="overLimit(p)" class="red small">Summadan oshdi</div></td>
          </tr>
          <tr v-if="!visible.length"><td colspan="8" class="empty">To‘lovlar yo‘q</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Oxirgi yopilgan kunlar</h2>
      <table class="table">
        <thead><tr><th>Sana</th><th>To‘lovlar</th><th>Kassaga tushgan</th><th>Yopgan</th></tr></thead>
        <tbody><tr v-for="c in data.recent" :key="c.id"><td>{{ c.date }}</td><td>{{ c.count }}</td><td>{{ formatSum(c.total) }}</td><td>{{ c.closedByName }}</td></tr></tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.closed { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; margin-bottom: 14px; }
.summary { display: flex; flex-wrap: wrap; gap: 8px 24px; padding: 12px 0; }
.green { color: #047857; }
.red { color: #b91c1c; }
.small { font-size: .8rem; }
.line { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 3px 0; border-bottom: 1px dashed #e5e7eb; }
.line:last-child { border-bottom: 0; }
.line label { display: flex; gap: 6px; align-items: flex-start; }
.line.off label { color: #9ca3af; }
.amount { width: 110px; padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 6px; text-align: right; }
tr.partial { background: #fffbeb; }
</style>
