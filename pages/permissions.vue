<script setup lang="ts">
definePageMeta({ alias: '/admin/permissions' })
const { permissionGroups } = useMeta()
const data = ref<any>(null)
const selectedId = ref<number | null>(null)
const error = ref('')

async function load() {
  try {
    data.value = await $fetch('/api/permissions')
    if (!selectedId.value) selectedId.value = data.value.users[0]?.id || null
  } catch (e: any) {
    error.value = apiError(e)
  }
}
const selected = computed(() => data.value?.users.find((u: any) => u.id === selectedId.value))
// A delegate sees only the permissions the super admin allowed it to pass on.
const groups = computed(() => permissionGroups.value
  .map((group) => ({ ...group, items: group.items.filter((item) => data.value?.grantable.includes(item.code)) }))
  .filter((group) => group.items.length))

async function setGrant(code: string, enabled: boolean, canGrant = false) {
  try {
    await $fetch('/api/permissions', { method: 'POST', body: { userId: selectedId.value, code, enabled, canGrant } })
    await load()
  } catch (e: any) {
    alert(apiError(e))
  }
}
onMounted(load)
</script>

<template>
  <div class="card">
    <h1>🔑 Ruxsatlarni berish</h1>
    <p class="muted" v-if="data?.canDelegate">
      Super admin har qanday ruxsatni beradi. «Boshqalarga bera oladi» belgisi qo‘yilsa, shu xodim (masalan, rahbar) aynan shu ruxsatni boshqa xodimlarga bera oladi.
      Roldan kelgan ruxsatlar <span class="badge blue">rol</span> bilan ko‘rsatiladi va Super admin → Rollar bo‘limida o‘zgartiriladi.
    </p>
    <p class="muted" v-else>Siz super admin bergan vakolat doirasidagi ruxsatlarni boshqa xodimlarga bera olasiz.</p>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="data" class="layout">
      <div class="users">
        <button v-for="u in data.users" :key="u.id" :class="{ active: u.id === selectedId }" @click="selectedId = u.id">
          <strong>{{ u.fullName || u.username }}</strong><br><small>{{ u.username }} · {{ u.roleName || 'rolsiz' }}{{ u.disabled ? ' · deaktiv' : '' }}</small>
        </button>
        <p v-if="!data.users.length" class="muted">Xodimlar yo‘q</p>
      </div>
      <div v-if="selected">
        <div v-for="group in groups" :key="group.section">
          <div class="section-title">{{ group.section }}</div>
          <div v-for="item in group.items" :key="item.code" class="perm">
            <label>
              <input type="checkbox" :checked="Boolean(selected.grants[item.code])" :disabled="!data.canDelegate && selected.grants[item.code]?.canGrant" @change="setGrant(item.code, ($event.target as HTMLInputElement).checked, selected.grants[item.code]?.canGrant)" />
              {{ item.label }}
            </label>
            <span v-if="selected.rolePermissions.includes(item.code)" class="badge blue">rol</span>
            <label v-if="data.canDelegate && selected.grants[item.code]" class="delegate">
              <input type="checkbox" :checked="selected.grants[item.code].canGrant" @change="setGrant(item.code, true, ($event.target as HTMLInputElement).checked)" />
              Boshqalarga bera oladi
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 260px 1fr; gap: 20px; }
.users { display: flex; flex-direction: column; gap: 6px; max-height: 70vh; overflow-y: auto; }
.users button { text-align: left; border: 1px solid #e5e7eb; background: white; border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.users button.active { border-color: #0f766e; background: #f0fdfa; }
.perm { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
.perm > label:first-child { flex: 1; display: flex; gap: 8px; }
.delegate { font-size: .85rem; color: #92400e; display: flex; gap: 6px; }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
</style>
