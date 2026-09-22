<script setup lang="ts">
const { data: me } = await useFetch('/api/auth/me')
const user = computed(() => (me as any).value?.user)
const canDelete = computed(() => user.value?.role === 'SUPER_ADMIN')

const departments = [
  { value: 'PARAZITOLOGIYA', label: 'Parazitologiya' },
  { value: 'VIRUSOLOGIYA', label: 'Virusologiya' },
  { value: 'BAKTERIOLOGIYA', label: 'Bakteriologiya' },
  { value: 'SAN_MINIMUM', label: 'San minimum' }
]

// Statistika
const stats = ref<any>(null)
async function loadStats() {
  const { data } = await useFetch('/api/payments/stats')
  stats.value = (data as any).value
}

// Forma
const form = reactive({
  patientId: null as number | null,
  department: 'PARAZITOLOGIYA',
  service: '',
  amount: '',
  note: ''
})

const selectedPatient = ref<any>(null)
const saving = ref(false)
const lastPayment = ref<any>(null)

// Bemor izlash
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searching = ref(false)
let searchTimer: any = null

function onSearchInput() {
  clearTimeout(searchTimer)
  if (!searchQuery.value || searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const { data } = await useFetch('/api/patients/search', {
        query: { q: searchQuery.value }
      })
      searchResults.value = (data as any).value?.patients || []
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
}

function clearPatient() {
  selectedPatient.value = null
  form.patientId = null
}

// Yangi bemor modali
const showNewPatientModal = ref(false)
const newPatient = reactive({
  fullName: '',
  phone: '',
  birthYear: '',
  address: ''
})

async function createPatient() {
  if (!newPatient.fullName) {
    alert('Ism-familiya shart')
    return
  }
  try {
    const res: any = await $fetch('/api/patients', {
      method: 'POST',
      body: {
        ...newPatient,
        birthYear: newPatient.birthYear ? Number(newPatient.birthYear) : null
      }
    })
    selectPatient(res.patient)
    showNewPatientModal.value = false
    Object.assign(newPatient, { fullName: '', phone: '', birthYear: '', address: '' })
  } catch (e: any) {
    alert('Xato: ' + (e.data?.statusMessage || e.message))
  }
}

// To'lov saqlash
async function savePayment() {
  if (!form.patientId) {
    alert('Bemorni tanlang')
    return
  }
  if (!form.amount) {
    alert('Summani kiriting')
    return
  }

  saving.value = true
  try {
    const res: any = await $fetch('/api/payments', {
      method: 'POST',
      body: {
        patientId: form.patientId,
        department: form.department,
        service: form.service,
        amount: Number(form.amount),
        note: form.note
      }
    })

    lastPayment.value = res.payment
    clearPatient()
    Object.assign(form, {
      patientId: null,
      department: 'PARAZITOLOGIYA',
      service: '',
      amount: '',
      note: ''
    })
    await Promise.all([loadStats(), loadPayments()])
  } catch (e: any) {
    alert('Xato: ' + (e.data?.statusMessage || e.message))
  } finally {
    saving.value = false
  }
}

// To'lovlar
const payments = ref<any[]>([])
const totalSum = ref(0)
const filter = reactive({ from: '', to: '', department: 'ALL', search: '' })

async function loadPayments() {
  const q: any = {}
  if (filter.from) q.from = filter.from
  if (filter.to) q.to = filter.to
  if (filter.department !== 'ALL') q.department = filter.department
  if (filter.search) q.search = filter.search

  const { data } = await useFetch('/api/payments', { query: q })
  payments.value = (data as any).value?.payments || []
  totalSum.value = (data as any).value?.totalSum || 0
}

function exportReport() {
  const params = new URLSearchParams()
  if (filter.from) params.set('from', filter.from)
  if (filter.to) params.set('to', filter.to)
  window.location.href = `/api/reports/payments?${params.toString()}`
}

async function deletePayment(id: number) {
  if (!canDelete.value) return
  if (!confirm('O‘chirilsinmi?')) return
  await $fetch(`/api/payments/${id}`, { method: 'DELETE' })
  await Promise.all([loadStats(), loadPayments()])
}

// Chek
function printReceipt() {
  if (!lastPayment.value) return
  const p = lastPayment.value
  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) return

  win.document.write(`
    <html><head><title>Chek</title>
    <style>
      body { font-family: monospace; padding: 20px; }
      h2 { text-align: center; }
      .sub { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
      table { width: 100%; }
      td { padding: 6px 0; }
      .right { text-align: right; }
      .sum { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
      hr { border: none; border-top: 1px dashed #999; margin: 12px 0; }
      .thanks { text-align: center; margin-top: 20px; font-style: italic; }
    </style></head>
    <body>
      <h2>KLINIKA KASSASI</h2>
      <div class="sub">Chek № ${p.id} — ${formatDate(p.createdAt)}</div>
      <hr>
      <table>
        <tr><td>Bemor:</td><td class="right"><b>${p.patient.fullName}</b></td></tr>
        ${p.patient.phone ? `<tr><td>Telefon:</td><td class="right">${p.patient.phone}</td></tr>` : ''}
        <tr><td>Bo‘lim:</td><td class="right">${depLabel(p.department)}</td></tr>
        ${p.service ? `<tr><td>Xizmat:</td><td class="right">${p.service}</td></tr>` : ''}
      </table>
      <hr>
      <table><tr class="sum"><td>JAMI:</td><td class="right">${formatSum(Number(p.amount))}</td></tr></table>
      <hr>
      <div class="thanks">Xaridingiz uchun rahmat!</div>
    </body></html>
  `)
  win.document.close()
  setTimeout(() => win.print(), 300)
}

// Yordamchi
function formatSum(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + ' so‘m'
}
function formatDate(d: string) {
  return new Date(d).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
function depLabel(d: string) {
  return departments.find((x) => x.value === d)?.label || d
}

let interval: any
onMounted(() => {
  loadStats()
  loadPayments()
  interval = setInterval(loadStats, 10000)
})
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="kassa-page">
    <h1>💰 Kassa</h1>

    <div v-if="stats" class="stats-grid">
      <div class="stat-card today">
        <div class="label">Bugun</div>
        <div class="value">{{ formatSum(stats.daily.total) }}</div>
        <div class="count">{{ stats.daily.count }} ta to‘lov</div>
      </div>
      <div class="stat-card week">
        <div class="label">Bu hafta</div>
        <div class="value">{{ formatSum(stats.weekly.total) }}</div>
        <div class="count">{{ stats.weekly.count }} ta</div>
      </div>
      <div class="stat-card month">
        <div class="label">Bu oy</div>
        <div class="value">{{ formatSum(stats.monthly.total) }}</div>
        <div class="count">{{ stats.monthly.count }} ta</div>
      </div>
      <div class="stat-card year">
        <div class="label">Bu yil</div>
        <div class="value">{{ formatSum(stats.yearly.total) }}</div>
        <div class="count">{{ stats.yearly.count }} ta</div>
      </div>
    </div>

    <div v-if="stats" class="dep-grid">
      <div v-for="d in stats.departmentStats" :key="d.department" class="dep-card">
        <div class="dep-name">{{ depLabel(d.department) }}</div>
        <div class="dep-total">{{ formatSum(d.total) }}</div>
        <div class="dep-count">{{ d.count }} ta (oylik)</div>
      </div>
    </div>

    <div class="card" style="margin-top: 24px">
      <h2>💵 Yangi to‘lov</h2>

      <div v-if="!selectedPatient" class="patient-search">
        <label class="search-label">1️⃣ Bemor izlash (ism yoki telefon)</label>
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Masalan: Karimov yoki 901234567"
            @input="onSearchInput"
          />
          <button class="btn secondary" @click="showNewPatientModal = true">
            ➕ Yangi bemor
          </button>
        </div>

        <div v-if="searching" class="search-hint">Qidirilmoqda...</div>

        <div v-if="searchResults.length" class="search-results">
          <div
            v-for="p in searchResults"
            :key="p.id"
            class="search-item"
            @click="selectPatient(p)"
          >
            <div class="search-name">{{ p.fullName }}</div>
            <div class="search-meta">
              <span v-if="p.phone">📞 {{ p.phone }}</span>
              <span v-if="p.birthYear">🎂 {{ p.birthYear }}</span>
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
            </div>
          </div>
        </div>
        <button class="btn secondary" @click="clearPatient">🔄 Boshqa</button>
      </div>

      <div v-if="selectedPatient" class="payment-form">
        <div class="form-grid">
          <div class="field">
            <label>Bo‘lim *</label>
            <select v-model="form.department">
              <option v-for="d in departments" :key="d.value" :value="d.value">
                {{ d.label }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>Xizmat nomi</label>
            <input v-model="form.service" type="text" placeholder="Qon analizi" />
          </div>

          <div class="field">
            <label>To‘lov summasi (so‘m) *</label>
            <input v-model="form.amount" type="number" min="0" step="1000" placeholder="50000" />
          </div>

          <div class="field">
            <label>Izoh</label>
            <input v-model="form.note" type="text" placeholder="Qo‘shimcha" />
          </div>
        </div>

        <button class="btn big" :disabled="saving" @click="savePayment">
          {{ saving ? 'Saqlanmoqda...' : '💾 To‘lovni saqlash va chek chiqarish' }}
        </button>
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
        <div v-if="lastPayment.service" class="receipt-row"><span>Xizmat:</span><strong>{{ lastPayment.service }}</strong></div>
        <div class="receipt-row"><span>Sana:</span><strong>{{ formatDate(lastPayment.createdAt) }}</strong></div>
        <div class="receipt-total"><span>JAMI:</span><strong>{{ formatSum(Number(lastPayment.amount)) }}</strong></div>
      </div>
    </div>

    <div class="card" style="margin-top: 24px">
      <h2>📋 To‘lovlar tarixi</h2>

      <div class="filters">
        <div class="field">
          <label>Bemor ismi</label>
          <input v-model="filter.search" type="text" placeholder="Karimov" />
        </div>
        <div class="field">
          <label>Dan</label>
          <input v-model="filter.from" type="date" />
        </div>
        <div class="field">
          <label>Gacha</label>
          <input v-model="filter.to" type="date" />
        </div>
        <div class="field">
          <label>Bo‘lim</label>
          <select v-model="filter.department">
            <option value="ALL">Barchasi</option>
            <option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option>
          </select>
        </div>
        <button class="btn secondary" @click="loadPayments">🔍 Filtrlash</button>
        <button class="btn secondary" @click="exportReport">📊 Excel yuklash</button>
      </div>

      <div class="total-line">
        Jami: <strong>{{ formatSum(totalSum) }}</strong> — {{ payments.length }} ta
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Sana</th>
            <th>Bemor ism-familiyasi</th>
            <th>Telefon</th>
            <th>Bo‘lim</th>
            <th>Xizmat</th>
            <th>Summa</th>
            <th v-if="canDelete">Amal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in payments" :key="p.id">
            <td>{{ i + 1 }}</td>
            <td>{{ formatDate(p.createdAt) }}</td>
            <td><strong>{{ p.patient.fullName }}</strong></td>
            <td>{{ p.patient.phone || '—' }}</td>
            <td>{{ depLabel(p.department) }}</td>
            <td>{{ p.service || '—' }}</td>
            <td class="sum">{{ formatSum(Number(p.amount)) }}</td>
            <td v-if="canDelete">
              <button class="btn danger small" @click="deletePayment(p.id)">🗑</button>
            </td>
          </tr>
          <tr v-if="!payments.length">
            <td :colspan="canDelete ? 8 : 7" class="empty">To‘lovlar topilmadi</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showNewPatientModal" class="modal-overlay" @click.self="showNewPatientModal = false">
      <div class="modal">
        <h2>➕ Yangi bemor</h2>
        <p class="modal-sub">Bemor bazada yo‘q — yangi yozuv yaratamiz</p>

        <div class="field">
          <label>Ism-familiya *</label>
          <input v-model="newPatient.fullName" type="text" />
        </div>
        <div class="field">
          <label>Telefon</label>
          <input v-model="newPatient.phone" type="tel" />
        </div>
        <div class="field">
          <label>Tug‘ilgan yili</label>
          <input v-model="newPatient.birthYear" type="number" />
        </div>
        <div class="field">
          <label>Manzil</label>
          <input v-model="newPatient.address" type="text" />
        </div>

        <div class="modal-actions">
          <button class="btn secondary" @click="showNewPatientModal = false">Bekor qilish</button>
          <button class="btn" @click="createPatient">💾 Saqlash</button>
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) auto;
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

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
}
.modal {
  background: white; border-radius: 14px;
  padding: 24px; max-width: 500px; width: 100%;
}
.modal h2 { margin: 0 0 6px; }
.modal-sub { color: #6b7280; font-size: 0.9rem; margin-bottom: 20px; }
.modal-actions {
  display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;
}
</style>