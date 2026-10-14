<script setup lang="ts">
definePageMeta({ alias: '/admin/kassa' })
const { t } = useI18n()
const { can } = useAuth()
const { departments, methods, depLabel, methodLabel } = useMeta()
const doctorList = ref<any[]>([])
const serviceList = ref<any[]>([])
const serviceGroups = computed(() => departments.value.map((department) => ({
  ...department,
  services: serviceList.value.filter((service: any) => service.department === department.value)
})))

const stats = ref<any>(null)
async function loadStats() {
  if (!can('REPORTS_DAILY')) return
  stats.value = await $fetch('/api/payments/stats').catch(() => null)
}

const emptyForm = () => ({
  patientId: null as number | null,
  department: 'PARAZITOLOGIYA',
  doctorId: null as number | null,
  method: 'CASH',
  contractId: null as number | null,
  serviceIds: [] as number[],
  service: '',
  amount: '' as string | number,
  note: ''
})
const form = reactive(emptyForm())
const selectedPatient = ref<any>(null)
const saving = ref(false)
const lastPayment = ref<any>(null)
const patientContracts = computed(() => (selectedPatient.value?.contractClients || []).map((item: any) => item.contract).filter((c: any) => c.active))
const servicesTotal = (ids: number[]) => serviceList.value.filter((s: any) => ids.includes(s.id)).reduce((sum: number, s: any) => sum + s.price, 0)

// Fill the amount from the selected services' prices; the cashier can still correct it.
watch(() => [...form.serviceIds], (ids) => {
  const total = servicesTotal(ids)
  if (total > 0 || form.method === 'CONTRACT') form.amount = total
})
watch(() => form.method, (method) => {
  if (method === 'CONTRACT' && !form.contractId) form.contractId = patientContracts.value[0]?.id || null
})

const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchTimer)
  if (searchQuery.value.length < 2) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      searchResults.value = (await $fetch<any>('/api/patients/search', { query: { q: searchQuery.value } })).patients
    } finally {
      searching.value = false
    }
  }, 300)
}

function selectPatient(p: any) {
  selectedPatient.value = p
  form.patientId = p.id
  searchQuery.value = ''
  searchResults.value = []
  const active = (p.contractClients || []).map((item: any) => item.contract).filter((c: any) => c.active)
  if (active.length) { form.method = 'CONTRACT'; form.contractId = active[0].id }
}
function clearPatient() {
  selectedPatient.value = null
  Object.assign(form, emptyForm())
}

const showNewPatientModal = ref(false)
const newPatient = reactive({ fullName: '', phone: '', birthYear: '', address: '' })
async function createPatient() {
  if (!newPatient.fullName) return alert('Ism-familiya shart')
  try {
    const res: any = await $fetch('/api/patients', { method: 'POST', body: { ...newPatient, birthYear: newPatient.birthYear ? Number(newPatient.birthYear) : null } })
    selectPatient(res.patient)
    showNewPatientModal.value = false
    Object.assign(newPatient, { fullName: '', phone: '', birthYear: '', address: '' })
  } catch (e: any) {
    alert('Xato: ' + apiError(e))
  }
}

async function savePayment() {
  if (!form.patientId) return alert('Bemorni tanlang')
  if (form.amount === '' && form.method !== 'CONTRACT') return alert('Summani kiriting')
  saving.value = true
  try {
    const res: any = await $fetch('/api/payments', { method: 'POST', body: { ...form, amount: Number(form.amount || 0) } })
    lastPayment.value = res.payment
    clearPatient()
    await Promise.all([loadStats(), loadPayments()])
  } catch (e: any) {
    alert('Xato: ' + apiError(e))
  } finally {
    saving.value = false
  }
}

const payments = ref<any[]>([])
const totalSum = ref(0)
const filter = reactive({ from: todayString(), to: todayString(), department: 'ALL', method: 'ALL', search: '' })
async function loadPayments() {
  if (!can('PAYMENTS_VIEW')) return
  const q: Record<string, string> = {}
  if (filter.from) q.from = filter.from
  if (filter.to) q.to = filter.to
  if (filter.department !== 'ALL') q.department = filter.department
  if (filter.method !== 'ALL') q.method = filter.method
  if (filter.search) q.search = filter.search
  const data: any = await $fetch('/api/payments', { query: q }).catch((e) => { alert(apiError(e)); return null })
  payments.value = data?.payments || []
  totalSum.value = data?.totalSum || 0
}

function exportReport() {
  const params = new URLSearchParams()
  if (filter.from) params.set('from', filter.from)
  if (filter.to) params.set('to', filter.to)
  window.location.href = `/api/reports/payments?${params.toString()}`
}

async function deletePayment(id: number) {
  if (!confirm('To‘lov o‘chirilsinmi?')) return
  try {
    await $fetch(`/api/payments/${id}`, { method: 'DELETE' })
    await Promise.all([loadStats(), loadPayments()])
  } catch (e: any) {
    alert(apiError(e))
  }
}

// Correcting an overpaid or mistyped payment
const editing = ref<any>(null)
const editForm = reactive({ ...emptyForm(), reason: '' })
const editContracts = ref<any[]>([])
async function openEdit(p: any) {
  editing.value = p
  Object.assign(editForm, {
    department: p.department, doctorId: p.doctorId, method: p.method, contractId: p.contractId,
    serviceIds: p.paymentServices.map((item: any) => item.serviceId), service: p.service || '', amount: p.amount, note: p.note || '', reason: ''
  })
  const found: any = await $fetch('/api/patients/search', { query: { q: p.patient.fullName } }).catch(() => ({ patients: [] }))
  editContracts.value = (found.patients.find((item: any) => item.id === p.patientId)?.contractClients || []).map((item: any) => item.contract)
}
async function saveEdit() {
  if (!editForm.reason.trim()) return alert('Tahrirlash sababini yozing')
  try {
    await $fetch(`/api/payments/${editing.value.id}`, { method: 'PUT', body: { ...editForm, amount: Number(editForm.amount || 0) } })
    editing.value = null
    await Promise.all([loadStats(), loadPayments()])
  } catch (e: any) {
    alert('Xato: ' + apiError(e))
  }
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))
function printReceipt() {
  if (!lastPayment.value) return
  const p = lastPayment.value
  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) return
  win.document.write(`
    <html><head><title>Chek</title>
    <style>
      body { font-family: monospace; padding: 20px; } h2 { text-align: center; }
      .sub { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
      table { width: 100%; } td { padding: 6px 0; } .right { text-align: right; }
      .sum { font-size: 18px; font-weight: bold; } hr { border: none; border-top: 1px dashed #999; margin: 12px 0; }
      .thanks { text-align: center; margin-top: 20px; font-style: italic; }
    </style></head>
    <body>
      <h2>KLINIKA KASSASI</h2>
      <div class="sub">Chek № ${p.id} — ${formatDate(p.createdAt)}</div><hr>
      <table>
        <tr><td>Bemor:</td><td class="right"><b>${escapeHtml(p.patient.fullName)}</b></td></tr>
        ${p.patient.phone ? `<tr><td>Telefon:</td><td class="right">${escapeHtml(p.patient.phone)}</td></tr>` : ''}
        <tr><td>Bo‘lim:</td><td class="right">${escapeHtml(depLabel(p.department))}</td></tr>
        <tr><td>Xizmat:</td><td class="right">${escapeHtml(paymentServices(p))}</td></tr>
        <tr><td>To‘lov turi:</td><td class="right">${escapeHtml(methodLabel(p.method))}</td></tr>
        ${p.contract ? `<tr><td>Shartnoma:</td><td class="right">№${escapeHtml(p.contract.number)} ${escapeHtml(p.contract.organization)}</td></tr>` : ''}
      </table><hr>
      <table><tr class="sum"><td>JAMI:</td><td class="right">${formatSum(Number(p.amount))}</td></tr></table><hr>
      <div class="thanks">Rahmat!</div>
    </body></html>`)
  win.document.close()
  setTimeout(() => win.print(), 300)
}

function paymentServices(payment: any) {
  return [...(payment.paymentServices || []).map((item: any) => item.service.name), payment.service].filter(Boolean).join(', ') || '—'
}

usePolling(loadStats, 30000)
onMounted(async () => {
  const [d, s]: any[] = await Promise.all([
    $fetch('/api/doctors').catch(() => ({ doctors: [] })),
    $fetch('/api/services').catch(() => ({ services: [] }))
  ])
  doctorList.value = d.doctors
  serviceList.value = s.services
  loadStats()
  loadPayments()
})
</script>

<template>
  <div class="kassa-page">
    <h1>💰 {{ t('cash') }}</h1>

    <div v-if="stats" class="stats-grid">
      <div class="stat-card today"><div class="label">{{ t('today') }}</div><div class="value">{{ formatSum(stats.daily.total) }}</div><div class="count">{{ stats.daily.count }} ta to‘lov</div></div>
      <div class="stat-card week"><div class="label">{{ t('week') }}</div><div class="value">{{ formatSum(stats.weekly.total) }}</div><div class="count">{{ stats.weekly.count }} ta</div></div>
      <div class="stat-card month"><div class="label">{{ t('month') }}</div><div class="value">{{ formatSum(stats.monthly.total) }}</div><div class="count">{{ stats.monthly.count }} ta</div></div>
      <div class="stat-card year"><div class="label">{{ t('year') }}</div><div class="value">{{ formatSum(stats.yearly.total) }}</div><div class="count">{{ stats.yearly.count }} ta</div></div>
    </div>
    <div v-if="stats" class="dep-grid">
      <div v-for="d in stats.departmentStats" :key="d.department" class="dep-card">
        <div class="dep-name">{{ depLabel(d.department) }}</div>
        <div class="dep-total">{{ formatSum(d.total) }}</div>
        <div class="dep-count">{{ d.count }} ta (oylik)</div>
      </div>
    </div>

    <div v-if="can('PAYMENTS_CREATE')" class="card" style="margin-top: 24px">
      <h2>💵 {{ t('newPayment') }}</h2>
      <div v-if="!selectedPatient" class="patient-search">
        <label class="search-label">1️⃣ Bemor izlash (ism yoki telefon). Shartnoma asosida kelgan mijozlar ham shu yerdan topiladi</label>
        <div class="search-box">
          <input v-model="searchQuery" type="text" placeholder="Masalan: Karimov yoki 901234567" @input="onSearchInput" />
          <button class="btn secondary" @click="showNewPatientModal = true">➕ Yangi bemor</button>
        </div>
        <div v-if="searching" class="search-hint">Qidirilmoqda...</div>
        <div v-if="searchResults.length" class="search-results">
          <div v-for="p in searchResults" :key="p.id" class="search-item" @click="selectPatient(p)">
            <div class="search-name">{{ p.fullName }}</div>
            <div class="search-meta">
              <span v-if="p.phone">📞 {{ p.phone }}</span>
              <span v-if="p.birthYear">🎂 {{ p.birthYear }}</span>
              <span v-for="c in p.contractClients" :key="c.contract.id" class="badge" :class="c.contract.active ? 'blue' : 'red'">📄 №{{ c.contract.number }} {{ c.contract.organization }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="selected-patient">
        <div class="selected-info">
          <div class="selected-avatar">👤</div>
          <div>
            <div class="selected-name">{{ selectedPatient.fullName }}</div>
            <div class="selected-meta">
              <span v-if="selectedPatient.phone">📞 {{ selectedPatient.phone }}</span>
              <span v-if="selectedPatient.birthYear">🎂 {{ selectedPatient.birthYear }}</span>
              <span v-for="c in patientContracts" :key="c.id" class="badge blue">📄 Shartnoma №{{ c.number }} — {{ c.organization }}</span>
            </div>
          </div>
        </div>
        <button class="btn secondary" @click="clearPatient">🔄 Boshqa</button>
      </div>

      <div v-if="selectedPatient" class="payment-form">
        <div class="form-grid">
          <div class="field">
            <label>Bo‘lim *</label>
            <select v-model="form.department"><option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option></select>
          </div>
          <div class="field service-picker">
            <label>2️⃣ Xizmatga yo‘naltirish: analiz/xizmatlar (bir yoki bir nechta)</label>
            <div v-for="group in serviceGroups" :key="group.value" class="service-group">
              <strong>{{ group.label }}</strong>
              <label v-for="service in group.services" :key="service.id" class="service-option">
                <input v-model="form.serviceIds" type="checkbox" :value="service.id" />
                <span>{{ service.name }} <small v-if="service.price" class="muted">({{ formatSum(service.price) }})</small></span>
              </label>
            </div>
            <input v-model="form.service" type="text" placeholder="Qo‘shimcha xizmat nomi (ixtiyoriy)" />
          </div>
          <div class="field">
            <label>Shifokor</label>
            <select v-model="form.doctorId"><option :value="null">Tanlanmagan</option><option v-for="d in doctorList" :key="d.id" :value="d.id">{{ d.fullName }}</option></select>
          </div>
          <div class="field">
            <label>To‘lov turi *</label>
            <select v-model="form.method">
              <option v-for="m in methods" :key="m.value" :value="m.value" :disabled="m.value === 'CONTRACT' && !patientContracts.length">{{ m.label }}</option>
            </select>
          </div>
          <div v-if="form.method === 'CONTRACT'" class="field">
            <label>Shartnoma *</label>
            <select v-model="form.contractId"><option v-for="c in patientContracts" :key="c.id" :value="c.id">№{{ c.number }} — {{ c.organization }}</option></select>
          </div>
          <div class="field">
            <label>Summa (so‘m) {{ form.method === 'CONTRACT' ? '(shartnoma bo‘yicha 0 bo‘lishi mumkin)' : '*' }}</label>
            <input v-model="form.amount" type="number" min="0" step="1000" placeholder="50000" />
          </div>
          <div class="field"><label>Izoh</label><input v-model="form.note" type="text" placeholder="Qo‘shimcha" /></div>
        </div>
        <button class="btn big" :disabled="saving" @click="savePayment">{{ saving ? 'Saqlanmoqda...' : '💾 Saqlash va bo‘limga yo‘naltirish' }}</button>
      </div>
    </div>

    <div v-if="lastPayment" class="card receipt" style="margin-top: 24px">
      <div class="receipt-header">
        <h2>✅ To‘lov qabul qilindi</h2>
        <button class="btn secondary" @click="printReceipt">🖨 Chek chiqarish</button>
      </div>
      <div class="receipt-body">
        <div class="receipt-row"><span>Chek raqami:</span><strong>#{{ lastPayment.id }}</strong></div>
        <div class="receipt-row"><span>Bemor:</span><strong>{{ lastPayment.patient.fullName }}</strong></div>
        <div class="receipt-row"><span>Bo‘lim:</span><strong>{{ depLabel(lastPayment.department) }}</strong></div>
        <div class="receipt-row"><span>Xizmat:</span><strong>{{ paymentServices(lastPayment) }}</strong></div>
        <div class="receipt-row"><span>To‘lov turi:</span><strong>{{ methodLabel(lastPayment.method) }}</strong></div>
        <div class="receipt-row"><span>Sana:</span><strong>{{ formatDate(lastPayment.createdAt) }}</strong></div>
        <div class="receipt-total"><span>JAMI:</span><strong>{{ formatSum(Number(lastPayment.amount)) }}</strong></div>
      </div>
    </div>

    <div v-if="can('PAYMENTS_VIEW')" class="card" style="margin-top: 24px">
      <h2>📋 {{ t('paymentHistory') }}</h2>
      <div class="filters">
        <div class="field"><label>{{ t('search') }}</label><input v-model="filter.search" type="text" placeholder="Karimov" /></div>
        <div class="field"><label>{{ t('from') }}</label><input v-model="filter.from" type="date" /></div>
        <div class="field"><label>{{ t('to') }}</label><input v-model="filter.to" type="date" /></div>
        <div class="field">
          <label>{{ t('department') }}</label>
          <select v-model="filter.department"><option value="ALL">{{ t('all') }}</option><option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option></select>
        </div>
        <div class="field">
          <label>To‘lov turi</label>
          <select v-model="filter.method"><option value="ALL">{{ t('all') }}</option><option v-for="m in methods" :key="m.value" :value="m.value">{{ m.label }}</option></select>
        </div>
        <div class="row">
          <button class="btn secondary" @click="loadPayments">🔍 Filtrlash</button>
          <button v-if="can('REPORTS_EXPORT')" class="btn secondary" @click="exportReport">📊 Excel</button>
        </div>
      </div>
      <div class="total-line">Jami: <strong>{{ formatSum(totalSum) }}</strong> — {{ payments.length }} ta</div>
      <table class="table">
        <thead>
          <tr><th>#</th><th>Sana</th><th>Bemor</th><th>Bo‘lim</th><th>Analiz/xizmatlar</th><th>Turi</th><th>Summa</th><th>Amal</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in payments" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ formatDate(p.createdAt) }}</td>
            <td><strong>{{ p.patient.fullName }}</strong><div class="muted">{{ p.patient.phone }}</div></td>
            <td>{{ depLabel(p.department) }}</td>
            <td>{{ paymentServices(p) }}<div v-if="p.editReason" class="badge amber">✏️ {{ p.editReason }}</div></td>
            <td>{{ methodLabel(p.method) }}<div v-if="p.contract" class="muted">№{{ p.contract.number }} {{ p.contract.organization }}</div></td>
            <td class="sum">{{ formatSum(Number(p.amount)) }}</td>
            <td>
              <button v-if="can('PAYMENTS_EDIT')" class="btn secondary small" title="Tahrirlash" @click="openEdit(p)">✏️</button>
              <button v-if="can('PAYMENTS_DELETE')" class="btn danger small" title="O‘chirish" @click="deletePayment(p.id)">🗑</button>
            </td>
          </tr>
          <tr v-if="!payments.length"><td colspan="8" class="empty">To‘lovlar topilmadi</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showNewPatientModal" class="modal-overlay" @click.self="showNewPatientModal = false">
      <div class="modal">
        <h2>➕ Yangi bemor</h2>
        <div class="field"><label>Ism-familiya *</label><input v-model="newPatient.fullName" type="text" /></div>
        <div class="field"><label>Telefon</label><input v-model="newPatient.phone" type="tel" /></div>
        <div class="field"><label>Tug‘ilgan yili</label><input v-model="newPatient.birthYear" type="number" /></div>
        <div class="field"><label>Manzil</label><input v-model="newPatient.address" type="text" /></div>
        <div class="modal-actions">
          <button class="btn secondary" @click="showNewPatientModal = false">Bekor qilish</button>
          <button class="btn" @click="createPatient">💾 Saqlash</button>
        </div>
      </div>
    </div>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal wide">
        <h2>✏️ To‘lov #{{ editing.id }} ni tahrirlash — {{ editing.patient.fullName }}</h2>
        <p class="muted">Ortiqcha yoki noto‘g‘ri to‘lovni tuzatish. Eski qiymat va sabab audit jurnalida saqlanadi.</p>
        <div class="form-grid">
          <div class="field"><label>Summa (so‘m)</label><input v-model="editForm.amount" type="number" min="0" /></div>
          <div class="field">
            <label>To‘lov turi</label>
            <select v-model="editForm.method"><option v-for="m in methods" :key="m.value" :value="m.value" :disabled="m.value === 'CONTRACT' && !editContracts.length">{{ m.label }}</option></select>
          </div>
          <div v-if="editForm.method === 'CONTRACT'" class="field">
            <label>Shartnoma</label>
            <select v-model="editForm.contractId"><option v-for="c in editContracts" :key="c.id" :value="c.id">№{{ c.number }} — {{ c.organization }}</option></select>
          </div>
          <div class="field"><label>Bo‘lim</label><select v-model="editForm.department"><option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option></select></div>
          <div class="field"><label>Shifokor</label><select v-model="editForm.doctorId"><option :value="null">Tanlanmagan</option><option v-for="d in doctorList" :key="d.id" :value="d.id">{{ d.fullName }}</option></select></div>
          <div class="field"><label>Izoh</label><input v-model="editForm.note" /></div>
        </div>
        <div class="field service-picker">
          <label>Xizmatlar</label>
          <div v-for="group in serviceGroups" :key="group.value" class="service-group">
            <strong>{{ group.label }}</strong>
            <label v-for="service in group.services" :key="service.id" class="service-option"><input v-model="editForm.serviceIds" type="checkbox" :value="service.id" /><span>{{ service.name }}</span></label>
          </div>
          <input v-model="editForm.service" type="text" placeholder="Qo‘shimcha xizmat nomi" />
        </div>
        <div class="field"><label>Tahrirlash sababi *</label><input v-model="editForm.reason" placeholder="Masalan: ortiqcha to‘lov qaytarildi" /></div>
        <div class="modal-actions">
          <button class="btn secondary" @click="editing = null">Bekor qilish</button>
          <button class="btn" @click="saveEdit">💾 Saqlash</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kassa-page { padding: 8px; }
h1 { margin-bottom: 20px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.stat-card {
  background: white;
  border-radius: 12px;
  padding: 18px;
  border-left: 5px solid #0f766e;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.stat-card.today { border-color: #0f766e; }
.stat-card.week { border-color: #0ea5e9; }
.stat-card.month { border-color: #d97706; }
.stat-card.year { border-color: #dc2626; }
.stat-card .label { font-size: 0.85rem; color: #6b7280; text-transform: uppercase; }
.stat-card .value { font-size: 1.4rem; font-weight: 700; margin: 8px 0 4px; }
.stat-card .count { font-size: 0.8rem; color: #9ca3af; }

.dep-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.dep-card {
  background: #f9fafb; border-radius: 10px; padding: 14px;
  border: 1px solid #e5e7eb;
}
.dep-name { font-size: 0.85rem; font-weight: 600; color: #374151; }
.dep-total { font-size: 1.1rem; font-weight: 700; color: #0f766e; margin: 6px 0 2px; }
.dep-count { font-size: 0.75rem; color: #9ca3af; }

.patient-search { margin-bottom: 20px; }
.search-label { display: block; font-weight: 600; margin-bottom: 8px; color: #374151; }
.search-box { display: flex; gap: 10px; }
.search-box input {
  flex: 1; padding: 12px 14px;
  border-radius: 10px; border: 2px solid #e5e7eb; font-size: 1rem;
}
.search-box input:focus { outline: none; border-color: #0f766e; }
.search-hint { color: #6b7280; font-size: 0.9rem; padding: 12px 0; }

.search-results {
  margin-top: 10px; background: white;
  border: 1px solid #e5e7eb; border-radius: 10px;
  max-height: 300px; overflow-y: auto;
}
.search-item {
  padding: 12px 16px; cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
}
.search-item:hover { background: #f0fdfa; }
.search-name { font-weight: 600; color: #1f2937; }
.search-meta { font-size: 0.85rem; color: #6b7280; display: flex; gap: 12px; margin-top: 4px; }

.selected-patient {
  display: flex; justify-content: space-between; align-items: center;
  background: #f0fdfa; border: 2px solid #0f766e;
  border-radius: 12px; padding: 16px 20px;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}
.selected-info { display: flex; align-items: center; gap: 14px; }
.selected-avatar {
  width: 48px; height: 48px; background: #0f766e; color: white;
  border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 1.4rem;
}
.selected-name { font-weight: 700; font-size: 1.1rem; }
.selected-meta { font-size: 0.85rem; color: #6b7280; display: flex; gap: 12px; margin-top: 4px; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px; margin-bottom: 18px;
}
.btn.big { padding: 14px 32px; font-size: 1.05rem; width: 100%; max-width: 400px; }

.receipt { border-left: 5px solid #10b981; }
.receipt-header {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
}
.receipt-body {
  background: #f9fafb; border-radius: 10px;
  padding: 18px; max-width: 500px;
}
.receipt-row {
  display: flex; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid #e5e7eb;
}
.receipt-total {
  display: flex; justify-content: space-between;
  padding: 14px 0 0; font-size: 1.2rem; color: #0f766e;
}
.receipt-total strong { font-size: 1.4rem; }

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px; align-items: end; margin-bottom: 14px;
}
.total-line {
  padding: 12px 0; border-bottom: 2px solid #e5e7eb;
  margin-bottom: 12px; font-size: 1.05rem;
}
.total-line strong { color: #0f766e; }

.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.table th, .table td {
  padding: 10px; text-align: left;
  border-bottom: 1px solid #e5e7eb;
}
.table th { background: #f9fafb; font-weight: 600; color: #374151; }
.table .sum { font-weight: 700; color: #0f766e; }
.table .empty { text-align: center; color: #9ca3af; padding: 30px; }


.service-group { margin: 8px 0; }
.service-option { display: flex; gap: 8px; font-weight: 400 !important; padding: 2px 0; }
.service-picker { grid-column: 1 / -1; }
</style>