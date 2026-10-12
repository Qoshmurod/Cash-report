<script setup lang="ts">
import type { FormError, DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { PersonState } from '~/components/forms/PersonFields.vue'
import type { Role, User, UserStatus, WorkSchedule } from '~/types/api'
import { defaultSchedule } from '~/utils/schedule'
import { emptyPerson, personToState, stateToPayload, validatePerson } from '~/utils/person'

definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.staff' })

const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const labels = useLabels()
const { confirm } = useConfirm()
const { formatDateTime } = useDate()
const lookups = useLookupOptions()

const list = usePaginatedList<User, { role: string | undefined; status: string | undefined }>('/users', {
  filters: { role: undefined, status: undefined },
})
const sortHeader = useSortHeader(list)
onMounted(() => void lookups.store.loadServices().catch(() => undefined))

const columns = computed<TableColumn<User>[]>(() => [
  { id: 'name', header: sortHeader(t('staff.employee'), 'lastName') },
  { accessorKey: 'login', header: sortHeader(t('auth.login'), 'login') },
  { accessorKey: 'role', header: sortHeader(t('staff.role'), 'role') },
  { accessorKey: 'phone', header: t('person.phone') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'lastLoginAt', header: t('staff.lastLogin') },
  { id: 'actions', header: '' },
])

// ─── Create / edit ───
interface StaffForm {
  login: string
  password: string
  role: Role
  status: UserStatus
  specialty: string
  roomNumber: string
  serviceIds: string[]
  workSchedule: WorkSchedule
}
const open = ref(false)
const editing = ref<User | null>(null)
const saving = ref(false)
const person = ref<PersonState>(emptyPerson())
const avatar = ref<string | null>(null)
const form = reactive<StaffForm>({ login: '', password: '', role: 'REGISTRAR', status: 'ACTIVE', specialty: '', roomNumber: '', serviceIds: [], workSchedule: defaultSchedule() })
const state = computed(() => ({ ...form, ...person.value }))

function openForm(u: User | null) {
  editing.value = u
  person.value = u ? personToState(u) : emptyPerson()
  avatar.value = u?.avatar ?? null
  Object.assign(form, {
    login: u?.login ?? '',
    password: '',
    role: u?.role ?? 'REGISTRAR',
    status: u?.status ?? 'ACTIVE',
    specialty: u?.doctor?.specialty ?? '',
    roomNumber: u?.doctor?.roomNumber ?? '',
    serviceIds: u?.doctor?.services?.map((s) => s.id) ?? [],
    workSchedule: u?.doctor?.workSchedule ?? defaultSchedule(),
  })
  open.value = true
}

function validate(): FormError[] {
  const e = validatePerson(person.value, t)
  if (!editing.value) {
    if (!/^[a-zA-Z0-9._-]{4,32}$/.test(form.login)) e.push({ name: 'login', message: t('staff.loginRule') })
    if (form.password.length < 6) e.push({ name: 'password', message: t('staff.passwordRule') })
  }
  if (form.role === 'DOCTOR' && !editing.value) {
    if (!form.specialty.trim()) e.push({ name: 'specialty', message: t('validation.required') })
    if (!form.roomNumber.trim()) e.push({ name: 'roomNumber', message: t('validation.required') })
  }
  return e
}

async function save() {
  saving.value = true
  try {
    const base = { ...stateToPayload(person.value, { profession: true }), avatar: avatar.value, role: form.role, status: form.status }
    if (editing.value) {
      await api.patch(`/users/${editing.value.id}`, base)
      toast.add({ title: t('toast.employeeUpdated'), color: 'success', icon: 'i-lucide-check' })
    } else {
      await api.post('/users', {
        ...base,
        login: form.login.trim(),
        password: form.password,
        doctor:
          form.role === 'DOCTOR'
            ? { specialty: form.specialty.trim(), roomNumber: form.roomNumber.trim(), workSchedule: form.workSchedule, serviceIds: form.serviceIds }
            : undefined,
      })
      toast.add({ title: t('toast.employeeCreated'), color: 'success', icon: 'i-lucide-check' })
    }
    open.value = false
    lookups.store.invalidate()
    void list.refresh()
  } finally {
    saving.value = false
  }
}

// ─── Reset password ───
const resetFor = ref<User | null>(null)
const newPassword = ref('')
const resetOpen = computed({
  get: () => !!resetFor.value,
  set: (v: boolean) => {
    if (!v) resetFor.value = null
  },
})
async function submitReset() {
  if (!resetFor.value) return
  await api.post(`/users/${resetFor.value.id}/reset-password`, { newPassword: newPassword.value })
  toast.add({ title: t('toast.passwordReset'), color: 'success', icon: 'i-lucide-check' })
  resetFor.value = null
  newPassword.value = ''
}

async function deactivate(u: User) {
  const r = await confirm({ title: t('staff.deactivateTitle', { name: personName(u) }), description: t('staff.deactivateDescription'), color: 'error', confirmLabel: t('common.deactivate') })
  if (!r.confirmed) return
  await api.del(`/users/${u.id}`)
  toast.add({ title: t('toast.employeeDeactivated'), color: 'success', icon: 'i-lucide-check' })
  void list.refresh()
}

async function activate(u: User) {
  await api.patch(`/users/${u.id}`, { status: 'ACTIVE' })
  toast.add({ title: t('toast.employeeUpdated'), color: 'success', icon: 'i-lucide-check' })
  void list.refresh()
}

// ─── Login history ───
const historyFor = ref<User | null>(null)
const historyOpen = computed({
  get: () => !!historyFor.value,
  set: (v: boolean) => {
    if (!v) historyFor.value = null
  },
})

function rowActions(u: User): DropdownMenuItem[][] {
  const isSelf = u.id === auth.user?.id
  return [
    [
      { label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => openForm(u) },
      { label: t('staff.resetPassword'), icon: 'i-lucide-key-round', onSelect: () => (resetFor.value = u) },
      { label: t('profile.loginHistory'), icon: 'i-lucide-history', onSelect: () => (historyFor.value = u) },
    ],
    isSelf
      ? []
      : u.status === 'ACTIVE'
        ? [{ label: t('common.deactivate'), icon: 'i-lucide-user-x', color: 'error' as const, onSelect: () => void deactivate(u) }]
        : [{ label: t('common.activate'), icon: 'i-lucide-user-check', color: 'success' as const, onSelect: () => void activate(u) }],
  ].filter((g) => g.length)
}
</script>

<template>
  <AppPage :title="t('nav.staff')" :description="t('staff.subtitle')">
    <ListToolbar v-model:search="list.search.value" :search-placeholder="t('staff.searchPlaceholder')" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.role" :items="labels.roleOptions.value" icon="i-lucide-shield" />
        <FilterSelect v-model="list.filters.status" :items="labels.userStatusOptions.value" icon="i-lucide-activity" />
      </template>
      <template #actions>
        <UButton icon="i-lucide-user-plus" :label="t('staff.create')" @click="openForm(null)" />
      </template>
    </ListToolbar>
    <DataTable
      v-model:page="list.page.value"
      v-model:limit="list.limit.value"
      :data="list.items.value"
      :columns="columns"
      :loading="list.loading.value"
      :error="list.error.value"
      :meta="list.meta.value"
      empty-icon="i-lucide-id-card"
      @retry="list.refresh"
    >
      <template #name-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar :src="row.original.avatar ?? undefined" :alt="personName(row.original)" size="sm" />
          <div class="leading-tight">
            <p class="font-medium text-highlighted">{{ personName(row.original) }}</p>
            <p class="text-xs text-muted">
              <template v-if="row.original.doctor">{{ row.original.doctor.specialty }} · {{ t('queues.roomShort', { room: row.original.doctor.roomNumber }) }}</template>
              <template v-else>{{ row.original.profession ?? row.original.email ?? '' }}</template>
            </p>
          </div>
        </div>
      </template>
      <template #login-cell="{ row }"><code class="text-xs">{{ row.original.login }}</code></template>
      <template #role-cell="{ row }"><StatusBadge kind="role" :value="row.original.role" /></template>
      <template #phone-cell="{ row }"><span class="tabular">{{ row.original.phone ?? '—' }}</span></template>
      <template #status-cell="{ row }">
        <StatusBadge kind="user" :value="row.original.status" />
        <UBadge v-if="row.original.mustChangePassword" color="warning" variant="outline" size="sm" class="ml-1">{{ t('staff.mustChange') }}</UBadge>
      </template>
      <template #lastLoginAt-cell="{ row }"><span class="tabular text-muted">{{ formatDateTime(row.original.lastLoginAt) }}</span></template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UDropdownMenu :items="rowActions(row.original)" :content="{ align: 'end' }">
            <UButton color="neutral" variant="ghost" icon="i-lucide-ellipsis-vertical" :aria-label="t('common.actions')" />
          </UDropdownMenu>
        </div>
      </template>
    </DataTable>

    <USlideover v-model:open="open" :title="editing ? t('staff.edit') : t('staff.create')" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <UForm id="staff-form" :state="state" :validate="validate" class="space-y-6" @submit="save">
          <AvatarUpload v-model="avatar" />
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="t('staff.role')" name="role" required>
              <USelect v-model="form.role" :items="labels.roleOptions.value" class="w-full" :disabled="!!editing && editing.role === 'DOCTOR'" />
            </UFormField>
            <UFormField :label="t('common.status')" name="status">
              <USelect v-model="form.status" :items="labels.userStatusOptions.value" class="w-full" />
            </UFormField>
            <template v-if="!editing">
              <UFormField :label="t('auth.login')" name="login" required :hint="t('staff.loginHint')">
                <UInput v-model="form.login" autocomplete="off" class="w-full font-mono" />
              </UFormField>
              <UFormField :label="t('auth.password')" name="password" required :hint="t('staff.passwordHint')">
                <UInput v-model="form.password" type="password" autocomplete="new-password" class="w-full" />
              </UFormField>
            </template>
          </div>
          <USeparator :label="t('staff.personal')" />
          <PersonFields v-model="person" show-profession />
          <template v-if="form.role === 'DOCTOR' && !editing">
            <USeparator :label="t('staff.doctorInfo')" />
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="t('doctor.specialty')" name="specialty" required>
                <UInput v-model="form.specialty" class="w-full" :placeholder="t('doctor.specialtyPlaceholder')" />
              </UFormField>
              <UFormField :label="t('doctor.room')" name="roomNumber" required>
                <UInput v-model="form.roomNumber" class="w-full" icon="i-lucide-door-open" />
              </UFormField>
              <UFormField :label="t('doctor.services')" name="serviceIds" class="sm:col-span-2">
                <USelectMenu v-model="form.serviceIds" :items="lookups.serviceOptions.value" value-key="value" multiple :placeholder="t('common.select')" class="w-full" />
              </UFormField>
            </div>
            <UFormField :label="t('doctor.schedule')">
              <WorkScheduleEditor v-model="form.workSchedule" />
            </UFormField>
          </template>
          <UAlert v-if="editing?.role === 'DOCTOR'" color="info" variant="subtle" icon="i-lucide-info" :title="t('staff.doctorEditHint')" :actions="[{ label: t('nav.doctors'), to: '/admin/doctors' }]" />
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="open = false" />
          <UButton type="submit" form="staff-form" :loading="saving" icon="i-lucide-save" :label="t('common.save')" />
        </div>
      </template>
    </USlideover>

    <UModal v-model:open="resetOpen" :title="t('staff.resetPasswordFor', { name: personName(resetFor) })" :description="t('staff.resetPasswordHint')">
      <template #body>
        <UFormField :label="t('password.new')">
          <UInput v-model="newPassword" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="resetFor = null" />
          <UButton :disabled="newPassword.length < 6" icon="i-lucide-key-round" :label="t('staff.resetPassword')" @click="submitReset" />
        </div>
      </template>
    </UModal>

    <USlideover v-model:open="historyOpen" :title="t('staff.loginHistoryOf', { name: personName(historyFor) })" :ui="{ content: 'max-w-4xl' }">
      <template #body>
        <LoginHistoryTable v-if="historyFor" :path="`/users/${historyFor.id}/login-history`" />
      </template>
    </USlideover>
  </AppPage>
</template>
