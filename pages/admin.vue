<script setup lang="ts">
const { departments, permissionGroups } = useMeta()
const reloadContact = inject<() => Promise<void>>('reloadContact')
const roles = ref<any[]>([])
const editing = ref<any>(null)
const contact = reactive({ enabled: true, telegram: '', instagram: '', phone: '', text: '' })
const saved = ref(false)

async function load() {
  roles.value = (await $fetch<any>('/api/roles')).roles
  Object.assign(contact, (await $fetch<any>('/api/settings/contact')).contact)
}
function openRole(role?: any) {
  editing.value = role
    ? { ...role, permissions: [...role.permissions], departments: [...role.departments] }
    : { name: '', description: '', permissions: [], departments: [] }
}
function toggleSection(items: { code: string }[], on: boolean) {
  const codes = items.map((item) => item.code)
  editing.value.permissions = on ? [...new Set([...editing.value.permissions, ...codes])] : editing.value.permissions.filter((code: string) => !codes.includes(code))
}
async function saveRole() {
  try {
    await $fetch(`/api/roles${editing.value.id ? `/${editing.value.id}` : ''}`, { method: (editing.value.id ? 'PUT' : 'POST') as any, body: editing.value })
    editing.value = null
    await load()
  } catch (e: any) {
    alert(apiError(e))
  }
}
async function removeRole(role: any) {
  if (!confirm(`"${role.name}" roli o‘chirilsinmi? Unga biriktirilgan ${role.userCount} ta xodim rolsiz qoladi.`)) return
  await $fetch(`/api/roles/${role.id}`, { method: 'DELETE' }).catch((e) => alert(apiError(e)))
  await load()
}
async function saveContact() {
  await $fetch('/api/settings/contact', { method: 'POST', body: contact })
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
  await reloadContact?.()
}
const labelOf = (code: string) => permissionGroups.value.flatMap((g) => g.items).find((item) => item.code === code)?.label || code
onMounted(load)
</script>

<template>
  <div>
    <div class="card">
      <div class="page-header">
        <h1>👑 Super admin — rollar</h1>
        <button class="btn" @click="openRole()">➕ Yangi rol</button>
      </div>
      <p class="muted">Rol — xodim qaysi bo‘limlarga kira olishi va qaysi amallarni bajara olishi. Rollarni faqat super admin yaratadi va tahrirlaydi. Xodimga rolni «Xodimlar» bo‘limida biriktiring.</p>
      <table class="table">
        <thead><tr><th>Rol</th><th>Bo‘limlar va ruxsatlar</th><th>Laboratoriya bo‘limlari</th><th>Xodimlar</th><th>Amal</th></tr></thead>
        <tbody>
          <tr v-for="r in roles" :key="r.id">
            <td><strong>{{ r.name }}</strong><div class="muted">{{ r.description }}</div></td>
            <td><span v-for="code in r.permissions" :key="code" class="badge">{{ labelOf(code) }}</span></td>
            <td><span v-for="d in r.departments" :key="d" class="badge blue">{{ departments.find((x) => x.value === d)?.label || d }}</span></td>
            <td>{{ r.userCount }}</td>
            <td><button class="btn secondary small" @click="openRole(r)">✏️</button><button class="btn danger small" @click="removeRole(r)">🗑</button></td>
          </tr>
          <tr v-if="!roles.length"><td colspan="5" class="empty">Hali rol yaratilmagan</td></tr>
        </tbody>
      </table>
    </div>

    <form class="card" @submit.prevent="saveContact">
      <h2>📞 Yuqori paneldagi aloqa ma’lumotlari</h2>
      <p class="muted">Ixtiyoriy. Yoqilgan bo‘lsa, to‘ldirilgan maydonlar har bir sahifaning eng yuqorisida (kirish sahifasida ham) ko‘rinadi. O‘chirsangiz panel yashiriladi, kiritilgan ma’lumotlar saqlanib qoladi.</p>
      <label class="toggle"><input v-model="contact.enabled" type="checkbox" /> Yuqori panelda ko‘rsatish</label>
      <div class="grid">
        <div class="field"><label>Telegram</label><input v-model="contact.telegram" placeholder="@username yoki havola" /></div>
        <div class="field"><label>Instagram</label><input v-model="contact.instagram" placeholder="@username yoki havola" /></div>
        <div class="field"><label>Telefon</label><input v-model="contact.phone" placeholder="+998 90 123 45 67" /></div>
        <div class="field"><label>Matn</label><input v-model="contact.text" placeholder="Masalan: Texnik yordam" /></div>
      </div>
      <button class="btn">💾 Saqlash</button> <span v-if="saved" class="success">Saqlandi</span>
    </form>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <form class="modal wide" @submit.prevent="saveRole">
        <h2>{{ editing.id ? '✏️ Rolni tahrirlash' : '➕ Yangi rol' }}</h2>
        <div class="grid">
          <div class="field"><label>Rol nomi *</label><input v-model="editing.name" placeholder="Rahbar, Kassir, Registrator..." required /></div>
          <div class="field"><label>Tavsif</label><input v-model="editing.description" /></div>
        </div>
        <div class="section-title">Laboratoriya bo‘limlariga kirish</div>
        <div class="checks">
          <label v-for="d in departments" :key="d.value"><input v-model="editing.departments" type="checkbox" :value="d.value" /> {{ d.label }}</label>
        </div>
        <div v-for="group in permissionGroups" :key="group.section">
          <div class="section-title">
            {{ group.section }}
            <button type="button" class="btn secondary small" @click="toggleSection(group.items, true)">hammasi</button>
            <button type="button" class="btn secondary small" @click="toggleSection(group.items, false)">hech biri</button>
          </div>
          <div class="checks">
            <label v-for="item in group.items" :key="item.code"><input v-model="editing.permissions" type="checkbox" :value="item.code" /> {{ item.label }}</label>
          </div>
        </div>
        <div class="modal-actions"><button type="button" class="btn secondary" @click="editing = null">Bekor qilish</button><button class="btn">💾 Saqlash</button></div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.toggle { display: flex; gap: 8px; align-items: center; font-weight: 600; margin-bottom: 12px; }
</style>
