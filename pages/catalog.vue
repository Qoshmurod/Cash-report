<script setup lang="ts">
const { can } = useAuth()
const { departments, depLabel } = useMeta()
const tab = ref(can('SERVICES_VIEW') ? 'services' : 'doctors')
const services = ref<any[]>([])
const doctors = ref<any[]>([])
const editing = ref<any>(null)

async function load() {
  if (can('SERVICES_VIEW')) services.value = (await $fetch<any>('/api/services', { query: { all: '1' } })).services
  if (can('DOCTORS_VIEW')) doctors.value = (await $fetch<any>('/api/doctors', { query: { all: '1' } })).doctors
}
const kind = computed(() => (tab.value === 'services' ? 'services' : 'doctors'))
function openNew() {
  editing.value = tab.value === 'services' ? { name: '', department: 'PARAZITOLOGIYA', price: 0, active: true } : { fullName: '', specialty: '', phone: '', active: true }
}
async function save() {
  const url = `/api/${kind.value}${editing.value.id ? `/${editing.value.id}` : ''}`
  try {
    await $fetch(url, { method: editing.value.id ? 'PUT' : 'POST', body: editing.value })
    editing.value = null
    await load()
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function toggle(item: any) {
  await $fetch(`/api/${kind.value}/${item.id}`, { method: 'PUT', body: { ...item, active: !item.active } }).catch((e) => alert(apiError(e)))
  await load()
}
async function remove(item: any) {
  if (!confirm(`"${item.name || item.fullName}" tizimdan butunlay o‘chirilsinmi? (Eski to‘lovlarda nomi saqlanadi)`)) return
  await $fetch(`/api/${kind.value}/${item.id}`, { method: 'DELETE' }).catch((e) => alert(apiError(e)))
  await load()
}
const canManage = computed(() => can(tab.value === 'services' ? 'SERVICES_MANAGE' : 'DOCTORS_MANAGE'))
onMounted(load)
</script>

<template>
  <div class="card">
    <div class="tabs">
      <button v-if="can('SERVICES_VIEW')" :class="{ active: tab === 'services' }" @click="tab = 'services'">🧪 Xizmatlar</button>
      <button v-if="can('DOCTORS_VIEW')" :class="{ active: tab === 'doctors' }" @click="tab = 'doctors'">🩺 Shifokorlar</button>
      <button v-if="canManage" class="btn" style="margin-left: auto" @click="openNew">➕ Qo‘shish</button>
    </div>
    <table v-if="tab === 'services'" class="table">
      <thead><tr><th>Nomi</th><th>Bo‘lim</th><th>Narx</th><th>Holat</th><th v-if="canManage">Amal</th></tr></thead>
      <tbody>
        <tr v-for="s in services" :key="s.id">
          <td>{{ s.name }}</td><td>{{ s.department ? depLabel(s.department) : '—' }}</td><td>{{ formatSum(s.price) }}</td>
          <td><span class="badge" :class="s.active ? 'green' : 'red'">{{ s.active ? 'Faol' : 'Deaktiv' }}</span></td>
          <td v-if="canManage">
            <button class="btn secondary small" @click="editing = { ...s }">✏️</button>
            <button class="btn warn small" @click="toggle(s)">{{ s.active ? 'Deaktivatsiya' : 'Faollashtirish' }}</button>
            <button class="btn danger small" @click="remove(s)">🗑</button>
          </td>
        </tr>
      </tbody>
    </table>
    <table v-else class="table">
      <thead><tr><th>F.I.O</th><th>Mutaxassislik</th><th>Telefon</th><th>Holat</th><th v-if="canManage">Amal</th></tr></thead>
      <tbody>
        <tr v-for="d in doctors" :key="d.id">
          <td>{{ d.fullName }}</td><td>{{ d.specialty || '—' }}</td><td>{{ d.phone || '—' }}</td>
          <td><span class="badge" :class="d.active ? 'green' : 'red'">{{ d.active ? 'Faol' : 'Deaktiv' }}</span></td>
          <td v-if="canManage">
            <button class="btn secondary small" @click="editing = { ...d }">✏️</button>
            <button class="btn warn small" @click="toggle(d)">{{ d.active ? 'Deaktivatsiya' : 'Faollashtirish' }}</button>
            <button class="btn danger small" @click="remove(d)">🗑</button>
          </td>
        </tr>
        <tr v-if="!doctors.length"><td colspan="5" class="empty">Shifokorlar yo‘q</td></tr>
      </tbody>
    </table>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <form class="modal" @submit.prevent="save">
        <h2>{{ editing.id ? '✏️ Tahrirlash' : '➕ Yangi' }}</h2>
        <template v-if="tab === 'services'">
          <div class="field"><label>Nomi</label><input v-model="editing.name" required /></div>
          <div class="field"><label>Bo‘lim</label><select v-model="editing.department"><option :value="null">—</option><option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option></select></div>
          <div class="field"><label>Narx (so‘m)</label><input v-model.number="editing.price" type="number" min="0" required /></div>
        </template>
        <template v-else>
          <div class="field"><label>F.I.O</label><input v-model="editing.fullName" required /></div>
          <div class="field"><label>Mutaxassislik</label><input v-model="editing.specialty" /></div>
          <div class="field"><label>Telefon</label><input v-model="editing.phone" /></div>
        </template>
        <label><input v-model="editing.active" type="checkbox" /> Faol</label>
        <div class="modal-actions"><button type="button" class="btn secondary" @click="editing = null">Bekor qilish</button><button class="btn">💾 Saqlash</button></div>
      </form>
    </div>
  </div>
</template>
