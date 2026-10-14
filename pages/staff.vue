<script setup lang="ts">
definePageMeta({ alias: '/admin/staff' })
const { user, can } = useAuth()
const users = ref<any[]>([])
const roles = ref<any[]>([])
const doctors = ref<any[]>([])
const editing = ref<any>(null)
const logins = ref<any[] | null>(null)
const loginsFor = ref('')
const loginTypes: Record<string, string> = { LOGIN: 'Kirdi', LOGOUT: 'Chiqdi', FAILED: 'Muvaffaqiyatsiz urinish' }

async function load() {
  users.value = (await $fetch<any>('/api/staff')).users
  roles.value = (await $fetch<any>('/api/roles').catch(() => ({ roles: [] }))).roles
  doctors.value = (await $fetch<any>('/api/doctors').catch(() => ({ doctors: [] }))).doctors
}
function openNew() {
  editing.value = { username: '', password: '', fullName: '', phone: '', position: '', roleId: null, doctorId: null }
}
async function save() {
  try {
    if (editing.value.id) await $fetch(`/api/staff/${editing.value.id}`, { method: 'PUT', body: editing.value })
    else await $fetch('/api/staff', { method: 'POST', body: editing.value })
    editing.value = null
    await load()
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function setStatus(u: any) {
  if (!confirm(u.disabled ? 'Faollashtirilsinmi?' : 'Deaktivatsiya qilinsinmi? Xodim tizimga kira olmaydi.')) return
  await $fetch(`/api/staff/${u.id}/status`, { method: 'POST', body: { disabled: !u.disabled } }).catch((e) => alert(apiError(e)))
  await load()
}
async function resetPassword(u: any) {
  const password = prompt(`${u.username} uchun yangi vaqtinchalik parol (kamida 12 belgi):`)
  if (!password) return
  await $fetch(`/api/staff/${u.id}/password`, { method: 'POST', body: { password } }).then(() => alert('Parol yangilandi. Xodim keyingi kirishda almashtiradi.')).catch((e) => alert(apiError(e)))
}
async function remove(u: any) {
  if (!confirm(`${u.username} tizimdan butunlay o‘chirilsinmi?`)) return
  await $fetch(`/api/staff/${u.id}`, { method: 'DELETE' }).catch((e) => alert(apiError(e)))
  await load()
}
async function showLogins(u: any) {
  loginsFor.value = u.username
  logins.value = (await $fetch<any>(`/api/staff/${u.id}/logins`)).logins
}
const isSuper = (u: any) => u.role !== 'OPERATOR'
onMounted(load)
</script>

<template>
  <div class="card">
    <div class="page-header">
      <h1>👔 Xodimlar</h1>
      <button v-if="user?.isSuperAdmin" class="btn" @click="openNew">➕ Yangi xodim</button>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Login</th><th>F.I.O</th><th>Lavozim / telefon</th><th>Rol</th><th>Holat</th><th>Oxirgi kirish</th><th>Amal</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><strong>{{ u.username }}</strong></td>
            <td>{{ u.fullName || '—' }}<div v-if="u.doctor" class="muted">🩺 {{ u.doctor.fullName }}</div></td>
            <td>{{ u.position || '—' }}<div class="muted">{{ u.phone }}</div></td>
            <td><span v-if="isSuper(u)" class="badge amber">👑 Super admin</span><span v-else class="badge blue">{{ u.customRole?.name || 'Rolsiz' }}</span></td>
            <td><span class="badge" :class="u.disabled ? 'red' : 'green'">{{ u.disabled ? 'Deaktiv' : 'Faol' }}</span></td>
            <td>{{ isSuper(u) ? '—' : formatDate(u.lastLoginAt) }}</td>
            <td>
              <template v-if="!isSuper(u)">
                <button class="btn secondary small" @click="showLogins(u)">🕘 Kirish tarixi</button>
                <template v-if="can('STAFF_MANAGE')">
                  <button class="btn secondary small" @click="editing = { ...u }">✏️</button>
                  <button class="btn warn small" @click="setStatus(u)">{{ u.disabled ? 'Faollashtirish' : 'Deaktivatsiya' }}</button>
                  <button class="btn danger small" @click="remove(u)">🗑</button>
                </template>
                <button v-if="user?.isSuperAdmin" class="btn secondary small" @click="resetPassword(u)">🔑 Parol</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <form class="modal" @submit.prevent="save">
        <h2>{{ editing.id ? '✏️ Xodimni tahrirlash' : '➕ Yangi xodim' }}</h2>
        <div class="field"><label>Login</label><input v-model="editing.username" required /></div>
        <div v-if="!editing.id" class="field"><label>Vaqtinchalik parol (kamida 12 belgi)</label><input v-model="editing.password" type="password" minlength="12" required /></div>
        <div class="field"><label>F.I.O</label><input v-model="editing.fullName" /></div>
        <div class="field"><label>Lavozim</label><input v-model="editing.position" placeholder="Rahbar, kassir, registrator..." /></div>
        <div class="field"><label>Telefon</label><input v-model="editing.phone" /></div>
        <template v-if="user?.isSuperAdmin">
          <div class="field"><label>Rol</label><select v-model="editing.roleId"><option :value="null">Rolsiz (faqat alohida ruxsatlar)</option><option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option></select></div>
          <div class="field"><label>Shifokorga bog‘lash (faqat o‘z to‘lovlarini ko‘radi)</label><select v-model="editing.doctorId"><option :value="null">—</option><option v-for="d in doctors" :key="d.id" :value="d.id">{{ d.fullName }}</option></select></div>
        </template>
        <div class="modal-actions"><button type="button" class="btn secondary" @click="editing = null">Bekor qilish</button><button class="btn">💾 Saqlash</button></div>
      </form>
    </div>

    <div v-if="logins" class="modal-overlay" @click.self="logins = null">
      <div class="modal wide">
        <h2>🕘 {{ loginsFor }} — kirish tarixi</h2>
        <table class="table">
          <thead><tr><th>Vaqt</th><th>Hodisa</th><th>IP</th><th>Qurilma</th></tr></thead>
          <tbody>
            <tr v-for="l in logins" :key="l.id"><td>{{ formatDate(l.createdAt) }}</td><td><span class="badge" :class="l.type === 'FAILED' ? 'red' : 'green'">{{ loginTypes[l.type] || l.type }}</span></td><td>{{ l.ip }}</td><td class="muted">{{ l.userAgent }}</td></tr>
            <tr v-if="!logins.length"><td colspan="4" class="empty">Yozuvlar yo‘q</td></tr>
          </tbody>
        </table>
        <div class="modal-actions"><button class="btn secondary" @click="logins = null">Yopish</button></div>
      </div>
    </div>
  </div>
</template>
