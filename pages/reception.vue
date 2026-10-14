<script setup lang="ts">
definePageMeta({ alias: '/admin/reception' })
const { can } = useAuth()
const doctorList = ref<any[]>([])
const serviceList = ref<any[]>([])
const appointments = ref<any[]>([])
const form = reactive({ doctorId: '', serviceId: '', notes: '' })
const statusLabels: Record<string, string> = { WAITING: 'Kutmoqda', IN_PROGRESS: 'Qabulda', COMPLETED: 'Yakunlangan', CANCELLED: 'Bekor qilingan' }

const query = ref('')
const results = ref<any[]>([])
const selected = ref<any>(null)
let timer: ReturnType<typeof setTimeout> | undefined
function onSearch() {
  clearTimeout(timer)
  if (query.value.length < 2) { results.value = []; return }
  timer = setTimeout(async () => {
    results.value = ((await $fetch<any>('/api/patients/search', { query: { q: query.value } }).catch(() => ({ patients: [] }))).patients)
  }, 300)
}
function choose(patient: any) {
  selected.value = patient
  results.value = []
  query.value = ''
}

async function load() {
  appointments.value = (await $fetch<any>('/api/appointments').catch(() => ({ appointments: [] }))).appointments
}
async function add() {
  if (!selected.value) return alert('Bemorni tanlang')
  try {
    await $fetch('/api/appointments', { method: 'POST', body: { ...form, patientId: selected.value.id } })
    Object.assign(form, { doctorId: '', serviceId: '', notes: '' })
    selected.value = null
    await load()
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function setStatus(id: number, status: string) {
  await $fetch(`/api/appointments/${id}`, { method: 'PATCH', body: { status } }).catch((e) => alert(apiError(e)))
  await load()
}
onMounted(async () => {
  const [d, s]: any[] = await Promise.all([$fetch('/api/doctors').catch(() => ({ doctors: [] })), $fetch('/api/services').catch(() => ({ services: [] }))])
  doctorList.value = d.doctors
  serviceList.value = s.services
  await load()
})
</script>

<template>
  <div>
    <div v-if="can('APPOINTMENTS_MANAGE')" class="card">
      <h1>📋 Qabul va navbat</h1>
      <p class="muted">Shartnoma asosida kelgan mijozni mavjud bemorlar orasidan izlang va kerakli xizmatga yo‘naltiring. To‘lov/shartnoma bo‘yicha rasmiylashtirish Kassa bo‘limida.</p>
      <div v-if="!selected" class="field">
        <label>Bemor izlash: ism, telefon, shartnoma raqami yoki tashkilot nomi</label>
        <input v-model="query" placeholder="Karimov, 901234567 yoki 12/2026" @input="onSearch" />
        <div v-for="p in results" :key="p.id" class="search-item" @click="choose(p)">
          <strong>{{ p.fullName }}</strong> <span class="muted">{{ p.phone }} {{ p.birthYear }}</span>
          <span v-for="c in p.contractClients" :key="c.contract.id" class="badge blue">📄 №{{ c.contract.number }} {{ c.contract.organization }}</span>
        </div>
      </div>
      <div v-else class="row" style="margin-bottom: 12px">
        <strong>👤 {{ selected.fullName }}</strong>
        <span v-for="c in selected.contractClients" :key="c.contract.id" class="badge blue">📄 Shartnoma №{{ c.contract.number }} — {{ c.contract.organization }}</span>
        <button class="btn secondary small" @click="selected = null">Boshqa bemor</button>
      </div>
      <div class="grid">
        <div class="field"><label>Shifokor</label><select v-model="form.doctorId"><option value="">Tanlanmagan</option><option v-for="d in doctorList" :key="d.id" :value="d.id">{{ d.fullName }}</option></select></div>
        <div class="field"><label>Xizmat</label><select v-model="form.serviceId"><option value="">Tanlanmagan</option><option v-for="s in serviceList" :key="s.id" :value="s.id">{{ s.name }}</option></select></div>
        <div class="field"><label>Izoh</label><input v-model="form.notes" /></div>
        <div class="field"><button class="btn" @click="add">Navbatga qo‘shish</button></div>
      </div>
    </div>
    <div class="card">
      <h2>Navbat</h2>
      <table class="table">
        <thead><tr><th>Vaqt</th><th>Bemor</th><th>Shifokor</th><th>Xizmat</th><th>Holat</th><th>Amal</th></tr></thead>
        <tbody>
          <tr v-for="a in appointments" :key="a.id">
            <td>{{ formatDate(a.scheduledAt) }}</td>
            <td>{{ a.patient.fullName }}</td>
            <td>{{ a.doctor?.fullName || '—' }}</td>
            <td>{{ a.service?.name || '—' }}</td>
            <td><span class="badge" :class="{ green: a.status === 'COMPLETED', amber: a.status === 'IN_PROGRESS', red: a.status === 'CANCELLED' }">{{ statusLabels[a.status] }}</span></td>
            <td v-if="can('APPOINTMENTS_MANAGE')">
              <button v-if="a.status === 'WAITING'" class="btn small" @click="setStatus(a.id, 'IN_PROGRESS')">Qabulda</button>
              <button v-if="a.status === 'IN_PROGRESS'" class="btn small" @click="setStatus(a.id, 'COMPLETED')">Yakunlash</button>
              <button v-if="a.status === 'WAITING' || a.status === 'IN_PROGRESS'" class="btn secondary small" @click="setStatus(a.id, 'CANCELLED')">Bekor</button>
            </td>
            <td v-else />
          </tr>
          <tr v-if="!appointments.length"><td colspan="6" class="empty">Navbat bo‘sh</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.search-item { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; cursor: pointer; }
.search-item:hover { background: #f0fdfa; }
</style>
