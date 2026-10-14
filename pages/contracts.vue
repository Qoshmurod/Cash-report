<script setup lang="ts">
const { can, canAny } = useAuth()
const tab = ref(canAny('CONTRACTS_VIEW', 'CONTRACTS_MANAGE') ? 'contracts' : 'letters')
const contracts = ref<any[]>([])
const letters = ref<any[]>([])
const busy = ref(false)
const message = ref('')

async function loadContracts() {
  if (!canAny('CONTRACTS_VIEW', 'CONTRACTS_MANAGE', 'GUARANTEE_LETTERS_UPLOAD')) return
  contracts.value = (await $fetch<any>('/api/contracts').catch(() => ({ contracts: [] }))).contracts
}
async function loadLetters() {
  if (!canAny('GUARANTEE_LETTERS_VIEW', 'GUARANTEE_LETTERS_UPLOAD')) return
  letters.value = (await $fetch<any>('/api/guarantee-letters').catch(() => ({ letters: [] }))).letters
}

// New contract: contract file + required client list (Excel or Word table)
const showNew = ref(false)
const form = reactive({ number: '', organization: '', startDate: '', endDate: '', note: '' })
const files = reactive<Record<'contract' | 'clients' | 'letter', File | null>>({ contract: null, clients: null, letter: null })
const pick = (key: 'contract' | 'clients' | 'letter', event: Event) => { files[key] = (event.target as HTMLInputElement).files?.[0] || null }
function importText(result: any) {
  return `Mijozlar: ${result.total} ta (yangi bemor: ${result.created}, bazadagi bemorga bog‘landi: ${result.linked}, takror: ${result.duplicates}, o‘qilmagan qator: ${result.skipped})`
}
async function createContract() {
  if (!files.clients) return alert('Mijozlar ro‘yxati faylini tanlang (Excel yoki Word)')
  const body = new FormData()
  Object.entries(form).forEach(([key, value]) => body.append(key, value))
  if (files.contract) body.append('contract', files.contract)
  body.append('clients', files.clients)
  busy.value = true
  try {
    const res: any = await $fetch('/api/contracts', { method: 'POST', body })
    message.value = `✅ Shartnoma №${res.contract.number} saqlandi. ${importText(res.import)}`
    showNew.value = false
    Object.assign(form, { number: '', organization: '', startDate: '', endDate: '', note: '' })
    files.contract = null
    files.clients = null
    await loadContracts()
  } catch (e: any) {
    alert(apiError(e))
  } finally {
    busy.value = false
  }
}

const viewing = ref<any>(null)
const clientSearch = ref('')
const filteredClients = computed(() => (viewing.value?.clients || []).filter((c: any) => !clientSearch.value || c.patient.fullName.toLowerCase().includes(clientSearch.value.toLowerCase())))
async function openContract(id: number) {
  viewing.value = (await $fetch<any>(`/api/contracts/${id}`)).contract
  clientSearch.value = ''
}
async function addClients(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !viewing.value) return
  const body = new FormData()
  body.append('clients', file)
  try {
    const res: any = await $fetch(`/api/contracts/${viewing.value.id}/clients`, { method: 'POST', body })
    alert(importText(res.import))
    await openContract(viewing.value.id)
    await loadContracts()
  } catch (e: any) {
    alert(apiError(e))
  }
  (event.target as HTMLInputElement).value = ''
}
async function removeClient(clientId: number) {
  if (!confirm('Mijozni shartnoma ro‘yxatidan olib tashlaysizmi?')) return
  await $fetch(`/api/contracts/${viewing.value.id}/clients/${clientId}`, { method: 'DELETE' }).catch((e) => alert(apiError(e)))
  await openContract(viewing.value.id)
}

const editing = ref<any>(null)
function openEdit(c: any) {
  editing.value = { ...c, startDate: c.startDate?.slice(0, 10) || '', endDate: c.endDate?.slice(0, 10) || '' }
}
async function saveEdit() {
  try {
    await $fetch(`/api/contracts/${editing.value.id}`, { method: 'PUT', body: editing.value })
    editing.value = null
    await loadContracts()
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function removeContract(c: any) {
  if (!confirm(`Shartnoma №${c.number} va uning mijozlar ro‘yxati o‘chirilsinmi? (Bemorlar bazada qoladi)`)) return
  await $fetch(`/api/contracts/${c.id}`, { method: 'DELETE' }).catch((e) => alert(apiError(e)))
  await loadContracts()
}

// Guarantee letters
const letterForm = reactive({ title: '', kind: 'TEMPLATE', contractId: '', note: '' })
async function uploadLetter() {
  if (!files.letter) return alert('Faylni tanlang')
  const body = new FormData()
  Object.entries(letterForm).forEach(([key, value]) => body.append(key, value))
  body.append('file', files.letter)
  try {
    await $fetch('/api/guarantee-letters', { method: 'POST', body })
    Object.assign(letterForm, { title: '', kind: 'TEMPLATE', contractId: '', note: '' })
    files.letter = null
    ;(document.getElementById('letter-file') as HTMLInputElement).value = ''
    await loadLetters()
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function removeLetter(id: number) {
  if (!confirm('O‘chirilsinmi?')) return
  await $fetch(`/api/guarantee-letters/${id}`, { method: 'DELETE' }).catch((e) => alert(apiError(e)))
  await loadLetters()
}

const isExpired = (c: any) => c.endDate && new Date(c.endDate) < new Date(new Date().toDateString())
onMounted(() => { loadContracts(); loadLetters() })
</script>

<template>
  <div>
    <div class="tabs">
      <button v-if="canAny('CONTRACTS_VIEW', 'CONTRACTS_MANAGE')" :class="{ active: tab === 'contracts' }" @click="tab = 'contracts'">📄 Shartnomalar</button>
      <button v-if="canAny('GUARANTEE_LETTERS_VIEW', 'GUARANTEE_LETTERS_UPLOAD')" :class="{ active: tab === 'letters' }" @click="tab = 'letters'">✉️ Kafolat xatlari</button>
    </div>

    <div v-if="tab === 'contracts'" class="card">
      <div class="page-header">
        <h1>📄 Shartnomalar</h1>
        <button v-if="can('CONTRACTS_MANAGE')" class="btn" @click="showNew = true">➕ Shartnoma yuklash</button>
      </div>
      <p v-if="message" class="success">{{ message }}</p>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>№</th><th>Tashkilot</th><th>Muddat</th><th>Mijozlar</th><th>Holat</th><th>Fayllar</th><th>Amal</th></tr></thead>
          <tbody>
            <tr v-for="c in contracts" :key="c.id">
              <td><strong>{{ c.number }}</strong></td>
              <td>{{ c.organization }}<div class="muted">{{ c.note }}</div></td>
              <td>{{ c.startDate?.slice(0, 10) || '—' }} — {{ c.endDate?.slice(0, 10) || '—' }}</td>
              <td>{{ c._count.clients }} ta<div class="muted">{{ c._count.payments }} ta murojaat</div></td>
              <td><span v-if="!c.active" class="badge red">Faol emas</span><span v-else-if="isExpired(c)" class="badge amber">Muddati o‘tgan</span><span v-else class="badge green">Faol</span></td>
              <td>
                <a v-if="c.fileName" :href="`/api/contracts/${c.id}/file`" class="btn secondary small">⬇ {{ c.fileName }}</a>
                <div class="muted">Ro‘yxat: {{ c.clientsFileName || '—' }}</div>
              </td>
              <td>
                <button class="btn secondary small" @click="openContract(c.id)">👥 Mijozlar</button>
                <button v-if="can('CONTRACTS_MANAGE')" class="btn secondary small" @click="openEdit(c)">✏️</button>
                <button v-if="can('CONTRACTS_MANAGE')" class="btn danger small" @click="removeContract(c)">🗑</button>
              </td>
            </tr>
            <tr v-if="!contracts.length"><td colspan="7" class="empty">Shartnomalar yo‘q</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="tab === 'letters'" class="card">
      <h1>✉️ Kafolat xatlari</h1>
      <form v-if="can('GUARANTEE_LETTERS_UPLOAD')" class="grid" style="margin-bottom: 18px" @submit.prevent="uploadLetter">
        <div class="field"><label>Nomi</label><input v-model="letterForm.title" placeholder="Kafolat xati namunasi" /></div>
        <div class="field"><label>Turi</label><select v-model="letterForm.kind"><option value="TEMPLATE">Namuna (shablon)</option><option value="LETTER">Kafolat xati</option></select></div>
        <div class="field"><label>Shartnoma (ixtiyoriy)</label><select v-model="letterForm.contractId"><option value="">—</option><option v-for="c in contracts" :key="c.id" :value="c.id">№{{ c.number }} {{ c.organization }}</option></select></div>
        <div class="field"><label>Izoh</label><input v-model="letterForm.note" /></div>
        <div class="field"><label>Fayl (Word, PDF, rasm)</label><input id="letter-file" type="file" @change="pick('letter', $event)" /></div>
        <div class="field"><button class="btn">⬆ Yuklash</button></div>
      </form>
      <p v-else class="muted">Kafolat xatini yuklash uchun super admin yoki u vakolat bergan shaxs ruxsat berishi kerak.</p>
      <table class="table">
        <thead><tr><th>Nomi</th><th>Turi</th><th>Shartnoma</th><th>Sana</th><th>Amal</th></tr></thead>
        <tbody>
          <tr v-for="l in letters" :key="l.id">
            <td><strong>{{ l.title }}</strong><div class="muted">{{ l.note }}</div></td>
            <td><span class="badge" :class="l.kind === 'TEMPLATE' ? 'blue' : 'green'">{{ l.kind === 'TEMPLATE' ? 'Namuna' : 'Kafolat xati' }}</span></td>
            <td>{{ l.contract ? `№${l.contract.number} ${l.contract.organization}` : '—' }}</td>
            <td>{{ formatDate(l.createdAt) }}</td>
            <td>
              <a :href="`/api/guarantee-letters/${l.id}/file`" class="btn secondary small">⬇ Yuklab olish</a>
              <button v-if="can('GUARANTEE_LETTERS_UPLOAD')" class="btn danger small" @click="removeLetter(l.id)">🗑</button>
            </td>
          </tr>
          <tr v-if="!letters.length"><td colspan="5" class="empty">Hali yuklanmagan</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showNew" class="modal-overlay" @click.self="showNew = false">
      <form class="modal" @submit.prevent="createContract">
        <h2>➕ Yangi shartnoma</h2>
        <div class="field"><label>Shartnoma raqami *</label><input v-model="form.number" required /></div>
        <div class="field"><label>Tashkilot *</label><input v-model="form.organization" required /></div>
        <div class="grid">
          <div class="field"><label>Boshlanish</label><input v-model="form.startDate" type="date" /></div>
          <div class="field"><label>Tugash</label><input v-model="form.endDate" type="date" /></div>
        </div>
        <div class="field"><label>Izoh</label><input v-model="form.note" /></div>
        <div class="field"><label>Shartnoma fayli (PDF, Word, rasm)</label><input type="file" @change="pick('contract', $event)" /></div>
        <div class="field">
          <label>Shartnoma asosida o‘tadigan mijozlar ro‘yxati * (Excel: .xlsx/.xls/.csv yoki Word: .docx jadval)</label>
          <input type="file" accept=".xlsx,.xls,.csv,.docx" required @change="pick('clients', $event)" />
          <span class="muted">Ustunlar avtomatik aniqlanadi: F.I.O (yoki Familiya/Ism/Otasining ismi), Telefon, Tug‘ilgan yili/sanasi, Lavozim, Manzil.</span>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showNew = false">Bekor qilish</button>
          <button class="btn" :disabled="busy">{{ busy ? 'Yuklanmoqda...' : '💾 Saqlash' }}</button>
        </div>
      </form>
    </div>

    <div v-if="viewing" class="modal-overlay" @click.self="viewing = null">
      <div class="modal wide">
        <div class="page-header">
          <h2>👥 №{{ viewing.number }} — {{ viewing.organization }} ({{ viewing.clients.length }} ta mijoz)</h2>
          <label v-if="can('CONTRACTS_MANAGE')" class="btn secondary small">➕ Ro‘yxatdan qo‘shish<input type="file" accept=".xlsx,.xls,.csv,.docx" hidden @change="addClients" /></label>
        </div>
        <input v-model="clientSearch" placeholder="Qidirish" style="width: 100%; padding: 8px; margin-bottom: 10px" />
        <table class="table">
          <thead><tr><th>#</th><th>F.I.O</th><th>Telefon</th><th>Tug‘ilgan yili</th><th>Lavozim</th><th /></tr></thead>
          <tbody>
            <tr v-for="(c, i) in filteredClients" :key="c.id">
              <td>{{ i + 1 }}</td><td>{{ c.patient.fullName }}</td><td>{{ c.patient.phone || '—' }}</td><td>{{ c.patient.birthYear || '—' }}</td><td>{{ c.position || '—' }}</td>
              <td><button v-if="can('CONTRACTS_MANAGE')" class="btn danger small" @click="removeClient(c.id)">✕</button></td>
            </tr>
          </tbody>
        </table>
        <div class="modal-actions"><button class="btn secondary" @click="viewing = null">Yopish</button></div>
      </div>
    </div>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <form class="modal" @submit.prevent="saveEdit">
        <h2>✏️ Shartnomani tahrirlash</h2>
        <div class="field"><label>Raqami</label><input v-model="editing.number" required /></div>
        <div class="field"><label>Tashkilot</label><input v-model="editing.organization" required /></div>
        <div class="grid">
          <div class="field"><label>Boshlanish</label><input v-model="editing.startDate" type="date" /></div>
          <div class="field"><label>Tugash</label><input v-model="editing.endDate" type="date" /></div>
        </div>
        <div class="field"><label>Izoh</label><input v-model="editing.note" /></div>
        <label><input v-model="editing.active" type="checkbox" /> Faol</label>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="editing = null">Bekor qilish</button>
          <button class="btn">💾 Saqlash</button>
        </div>
      </form>
    </div>
  </div>
</template>
