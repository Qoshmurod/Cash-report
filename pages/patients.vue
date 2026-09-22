<script setup lang="ts">
const { data: me } = await useFetch('/api/auth/me')
const user = computed(() => (me as any).value?.user)
const canEdit = computed(() => ['SUPER_ADMIN', 'OPERATOR'].includes(user.value?.role))
const canDelete = computed(() => user.value?.role === 'SUPER_ADMIN')
const canImport = computed(() => user.value?.role === 'SUPER_ADMIN')

const patients = ref<any[]>([])
const total = ref(0)
const filter = reactive({ search: '', from: '', to: '', page: 1 })

const showModal = ref(false)
const editing = ref<any>(null)
const form = reactive({
  fullName: '',
  phone: '',
  birthYear: '',
  address: '',
  note: ''
})

async function load() {
  const q: any = { page: filter.page }
  if (filter.search) q.search = filter.search
  if (filter.from) q.from = filter.from
  if (filter.to) q.to = filter.to

  const { data } = await useFetch('/api/patients', { query: q })
  patients.value = (data as any).value?.patients || []
  total.value = (data as any).value?.total || 0
}

function openNew() {
  editing.value = null
  Object.assign(form, { fullName: '', phone: '', birthYear: '', address: '', note: '' })
  showModal.value = true
}

function openEdit(p: any) {
  editing.value = p
  Object.assign(form, {
    fullName: p.fullName,
    phone: p.phone || '',
    birthYear: p.birthYear || '',
    address: p.address || '',
    note: p.note || ''
  })
  showModal.value = true
}

async function save() {
  if (!form.fullName) {
    alert('Ism shart')
    return
  }
  const body = {
    ...form,
    birthYear: form.birthYear ? Number(form.birthYear) : null
  }

  try {
    if (editing.value) {
      await $fetch(`/api/patients/${editing.value.id}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/patients', { method: 'POST', body })
    }
    showModal.value = false
    await load()
  } catch (e: any) {
    alert('Xato: ' + (e.data?.statusMessage || e.message))
  }
}

async function remove(id: number) {
  if (!canDelete.value) return
  if (!confirm('Bemorni o‘chirishni tasdiqlaysizmi?')) return
  await $fetch(`/api/patients/${id}`, { method: 'DELETE' })
  await load()
}

const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)

function triggerImport() {
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true

  try {
    const body = new FormData()
    body.append('file', file)
    const res: any = await $fetch('/api/patients/import', {
      method: 'POST',
      body
    })

    alert(`✅ Qo'shildi: ${res.added}\n⏭ O'tkazib yuborildi: ${res.skipped}`)
    await load()
  } catch (err: any) {
    alert('Xato: ' + err.message)
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function downloadTemplate() {
  const csv = 'Ism-familiya;Telefon;Tugilgan yili;Manzil\nKarimov Ali;+998901234567;1990;Muborak\n'
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bemorlar-shablon.csv'
  a.click()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="page-header">
      <h1>👥 Bemorlar bazasi</h1>
      <div class="header-actions">
        <button v-if="canImport" class="btn secondary" @click="downloadTemplate">📄 Shablon</button>
        <button v-if="canImport" class="btn secondary" :disabled="importing" @click="triggerImport">
          {{ importing ? '⏳...' : '📥 Excel/CSV import' }}
        </button>
        <button v-if="canEdit" class="btn" @click="openNew">➕ Yangi bemor</button>
      </div>
      <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv,.txt" style="display: none" @change="onFileChange" />
    </div>

    <div class="filters">
      <div class="field">
        <label>Qidirish</label>
        <input v-model="filter.search" type="text" placeholder="Ism yoki telefon" />
      </div>
      <div class="field">
        <label>Dan</label>
        <input v-model="filter.from" type="date" />
      </div>
      <div class="field">
        <label>Gacha</label>
        <input v-model="filter.to" type="date" />
      </div>
      <button class="btn secondary" @click="load">🔍 Filtrlash</button>
    </div>

    <div class="total-line">Jami: <strong>{{ total }}</strong> ta bemor</div>

    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Ism-familiya</th>
          <th>Telefon</th>
          <th>Tug‘ilgan yili</th>
          <th>Manzil</th>
          <th v-if="canEdit">Amal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(p, i) in patients" :key="p.id">
          <td>{{ (filter.page - 1) * 50 + i + 1 }}</td>
          <td><strong>{{ p.fullName }}</strong></td>
          <td>{{ p.phone || '—' }}</td>
          <td>{{ p.birthYear || '—' }}</td>
          <td>{{ p.address || '—' }}</td>
          <td v-if="canEdit">
            <button class="btn secondary small" @click="openEdit(p)">✏️</button>
            <button v-if="canDelete" class="btn danger small" @click="remove(p.id)">🗑</button>
          </td>
        </tr>
        <tr v-if="!patients.length">
          <td :colspan="canEdit ? 6 : 5" class="empty">Bemorlar topilmadi</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <h2>{{ editing ? '✏️ Tahrirlash' : '➕ Yangi bemor' }}</h2>
        <div class="field">
          <label>Ism-familiya *</label>
          <input v-model="form.fullName" type="text" />
        </div>
        <div class="field">
          <label>Telefon</label>
          <input v-model="form.phone" type="tel" />
        </div>
        <div class="field">
          <label>Tug‘ilgan yili</label>
          <input v-model="form.birthYear" type="number" />
        </div>
        <div class="field">
          <label>Manzil</label>
          <input v-model="form.address" type="text" />
        </div>
        <div class="field">
          <label>Izoh</label>
          <input v-model="form.note" type="text" />
        </div>
        <div class="modal-actions">
          <button class="btn secondary" @click="showModal = false">Bekor qilish</button>
          <button class="btn" @click="save">💾 Saqlash</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex; justify-content: space-between;
  align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
}
.header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) auto;
  gap: 10px; align-items: end; margin-bottom: 16px;
}
.total-line {
  padding: 12px 0; border-bottom: 2px solid #e5e7eb;
  margin-bottom: 12px;
}
.total-line strong { color: #0f766e; }
.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
.table th { background: #f9fafb; font-weight: 600; }
.table .empty { text-align: center; color: #9ca3af; padding: 30px; }
.btn.small { padding: 4px 10px; font-size: 0.8rem; margin-right: 4px; }
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
}
.modal {
  background: white; border-radius: 14px;
  padding: 24px; max-width: 500px; width: 100%;
}
.modal-actions {
  display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;
}
</style>