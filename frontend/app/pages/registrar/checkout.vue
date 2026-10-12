<script setup lang="ts">
import type { FormError, StepperItem } from '@nuxt/ui'
import type { PersonState } from '~/components/forms/PersonFields.vue'
import type {
  CheckoutDto,
  CheckoutResult,
  Doctor,
  KioskCatalog,
  KioskRequest,
  Patient,
  PaymentMethod,
  Service,
} from '~/types/api'
import { PAYMENT_METHODS } from '~/types/api'
import { MAX_CHECKOUT_ITEMS } from '~/utils/constants'
import { emptyPerson, stateToPayload, validatePerson } from '~/utils/person'

definePageMeta({ roles: ['REGISTRAR', 'ADMIN'], titleKey: 'nav.newRegistration' })

const { t, locale } = useI18n()
const api = useApi()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const labels = useLabels()
const { format } = useMoney()
const { formatDate, age } = useDate()

// ───────────── State ─────────────
const step = ref(0)
const idempotencyKey = ref(crypto.randomUUID())
const kioskRequest = ref<KioskRequest | null>(null)
const bootLoading = ref(true)

const patientMode = ref<'existing' | 'new'>('new')
const selectedPatient = ref<Patient | null>(null)
const newPatient = ref<PersonState>(emptyPerson())
const patientSearch = ref('')
const searchResults = ref<Patient[]>([])
const searching = ref(false)
const duplicates = ref<Patient[]>([])

const catalog = ref<KioskCatalog>({ departments: [] })
const catalogLoading = ref(false)
const doctors = ref<Doctor[]>([])
interface Line {
  serviceId: string
  doctorId: string | undefined
}
const lines = ref<Line[]>([])
const pickerOpen = ref(false)
const pickerSelection = ref<string[]>([])

const method = ref<PaymentMethod>('CASH')
const paidAmount = ref(0)
const paidTouched = ref(false)
const contractNumber = ref('')
const contractOrganization = ref('')
const note = ref('')

const submitting = ref(false)
const result = ref<CheckoutResult | null>(null)

// ───────────── Derived ─────────────
const serviceMap = computed(() => {
  const m = new Map<string, Service & { departmentName: string }>()
  for (const d of catalog.value.departments) {
    const depName = locale.value === 'ru' && d.nameRu ? d.nameRu : d.name
    for (const s of d.services) m.set(s.id, { ...s, departmentName: depName })
  }
  return m
})
const serviceName = (s: { name: string; nameRu: string | null }) => (locale.value === 'ru' && s.nameRu ? s.nameRu : s.name)
const doctorsFor = (serviceId: string) => doctors.value.filter((d) => d.isAvailable && d.services?.some((s) => s.id === serviceId))
const total = computed(() => lines.value.reduce((sum, l) => sum + (serviceMap.value.get(l.serviceId)?.price ?? 0), 0))
const remaining = computed(() => Math.max(0, total.value - paidAmount.value))
const unavailableLines = computed(() => lines.value.filter((l) => !serviceMap.value.has(l.serviceId)))

const patientDisplay = computed(() => {
  if (patientMode.value === 'existing' && selectedPatient.value) return personName(selectedPatient.value, true)
  return personName({ firstName: newPatient.value.firstName, lastName: newPatient.value.lastName, middleName: newPatient.value.middleName }, true)
})

const steps = computed<StepperItem[]>(() => [
  { title: t('checkout.steps.patient'), icon: 'i-lucide-user-round' },
  { title: t('checkout.steps.services'), icon: 'i-lucide-clipboard-list' },
  { title: t('checkout.steps.payment'), icon: 'i-lucide-wallet' },
  { title: t('checkout.steps.done'), icon: 'i-lucide-receipt' },
])

// ───────────── Loading ─────────────
async function loadCatalog() {
  catalogLoading.value = true
  try {
    const [cat, docs] = await Promise.all([
      api.get<KioskCatalog>('/kiosk/catalog'),
      api.get<Doctor[]>('/doctors', { available: true, limit: 100 }),
    ])
    catalog.value = cat
    doctors.value = docs
  } finally {
    catalogLoading.value = false
  }
}

function autoAssignDoctors() {
  for (const l of lines.value) {
    if (l.doctorId && doctorsFor(l.serviceId).some((d) => d.id === l.doctorId)) continue
    const options = doctorsFor(l.serviceId)
    l.doctorId = options.length === 1 ? options[0]?.id : undefined
  }
}

async function boot() {
  bootLoading.value = true
  try {
    await loadCatalog().catch(() => undefined)
    const requestId = typeof route.query.request === 'string' ? route.query.request : null
    const patientId = typeof route.query.patient === 'string' ? route.query.patient : null
    if (requestId) {
      try {
        await api.post(`/kiosk-requests/${requestId}/claim`, undefined, { toastError: true })
      } catch {
        await router.replace('/registrar')
        return
      }
      const req = await api.get<KioskRequest>(`/kiosk-requests/${requestId}`)
      kioskRequest.value = req
      newPatient.value = {
        ...emptyPerson(),
        firstName: req.firstName,
        lastName: req.lastName,
        middleName: req.middleName ?? '',
        phone: req.phone,
        birthDate: req.birthDate ?? '',
        gender: req.gender ?? undefined,
      }
      duplicates.value = req.matchedPatients ?? []
      lines.value = req.items.map((i) => ({ serviceId: i.serviceId, doctorId: undefined }))
      if (duplicates.value.length === 1 && duplicates.value[0]) selectPatient(duplicates.value[0])
    } else if (patientId) {
      selectPatient(await api.get<Patient>(`/patients/${patientId}`))
    }
    autoAssignDoctors()
  } finally {
    bootLoading.value = false
  }
}
onMounted(boot)

// ───────────── Patient step ─────────────
function selectPatient(p: Patient) {
  selectedPatient.value = p
  patientMode.value = 'existing'
}

const runSearch = useDebounceFn(async () => {
  const q = patientSearch.value.trim()
  if (q.length < 2) {
    searchResults.value = []
    return
  }
  searching.value = true
  try {
    searchResults.value = (await api.list<Patient>('/patients', { search: q, limit: 8 })).data
  } catch {
    searchResults.value = []
  } finally {
    searching.value = false
  }
}, 350)
watch(patientSearch, () => runSearch())

function validatePatient(): boolean {
  if (patientMode.value === 'existing') {
    if (!selectedPatient.value) {
      toast.add({ title: t('checkout.selectPatientFirst'), color: 'warning', icon: 'i-lucide-user-x' })
      return false
    }
    return true
  }
  const errors = validatePerson(newPatient.value, t, true)
  if (errors.length) {
    toast.add({ title: t('checkout.fixPatientErrors'), description: errors.map((e) => e.message).join('; '), color: 'warning', icon: 'i-lucide-user-x' })
    return false
  }
  return true
}
const patientFormValidate = (s: PersonState): FormError[] => validatePerson(s, t, true)

// ───────────── Services step ─────────────
function openPicker() {
  pickerSelection.value = lines.value.map((l) => l.serviceId)
  pickerOpen.value = true
}
function applyPicker() {
  const keep = lines.value.filter((l) => pickerSelection.value.includes(l.serviceId))
  const added = pickerSelection.value.filter((id) => !keep.some((l) => l.serviceId === id)).map((id) => ({ serviceId: id, doctorId: undefined }))
  lines.value = [...keep, ...added].slice(0, MAX_CHECKOUT_ITEMS)
  autoAssignDoctors()
  pickerOpen.value = false
}
function removeLine(idx: number) {
  lines.value.splice(idx, 1)
}
function validateServices(): boolean {
  if (!lines.value.length) {
    toast.add({ title: t('checkout.addServiceFirst'), color: 'warning', icon: 'i-lucide-clipboard-x' })
    return false
  }
  if (unavailableLines.value.length) {
    toast.add({ title: t('checkout.removeUnavailable'), color: 'warning', icon: 'i-lucide-ban' })
    return false
  }
  if (lines.value.some((l) => !l.doctorId)) {
    toast.add({ title: t('checkout.chooseDoctors'), color: 'warning', icon: 'i-lucide-stethoscope' })
    return false
  }
  return true
}

// ───────────── Payment step ─────────────
const methodItems = computed(() =>
  PAYMENT_METHODS.map((m) => ({ value: m, label: labels.paymentMethod(m), description: t(`checkout.methodHint.${m}`), icon: PAYMENT_METHOD_ICON[m] })),
)
watch(total, (v) => {
  if (!paidTouched.value) paidAmount.value = v
  if (paidAmount.value > v) paidAmount.value = v
})
function setPaid(v: number | null | undefined) {
  paidTouched.value = true
  paidAmount.value = Math.max(0, Math.min(total.value, Number(v ?? 0)))
}
function validatePayment(): boolean {
  if (method.value === 'CONTRACT' && !contractNumber.value.trim()) {
    toast.add({ title: t('checkout.contractRequired'), color: 'warning', icon: 'i-lucide-file-warning' })
    return false
  }
  if (paidAmount.value < 0 || paidAmount.value > total.value) return false
  return true
}

// ───────────── Navigation ─────────────
function next() {
  if (step.value === 0 && !validatePatient()) return
  if (step.value === 1 && !validateServices()) return
  step.value = Math.min(2, step.value + 1)
}
function back() {
  step.value = Math.max(0, step.value - 1)
}

async function submit() {
  if (submitting.value) return
  if (!validatePatient() || !validateServices() || !validatePayment()) return
  submitting.value = true
  const body: CheckoutDto = {
    idempotencyKey: idempotencyKey.value,
    kioskRequestId: kioskRequest.value?.id,
    patientId: patientMode.value === 'existing' ? selectedPatient.value?.id : undefined,
    patient:
      patientMode.value === 'new'
        ? (() => {
            const p = stateToPayload(newPatient.value, { profession: true, passport: true })
            return { ...p, phone: p.phone ?? '' }
          })()
        : undefined,
    items: lines.value.map((l) => ({ serviceId: l.serviceId, doctorId: l.doctorId ?? '' })),
    method: method.value,
    paidAmount: paidAmount.value,
    contractNumber: method.value === 'CONTRACT' ? contractNumber.value.trim() : undefined,
    contractOrganization: method.value === 'CONTRACT' && contractOrganization.value.trim() ? contractOrganization.value.trim() : undefined,
    note: note.value.trim() || undefined,
  }
  try {
    result.value = await api.post<CheckoutResult>('/registrations', body)
    step.value = 3
    toast.add({
      title: t('toast.paymentSaved'),
      description: t('toast.queueCreated', { tickets: result.value.tickets.map((tk) => tk.ticketNumber).join(', ') }),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  } finally {
    submitting.value = false
  }
}

function nextPatient() {
  // New key per checkout: a retry of the SAME checkout reuses the key, a new patient gets a fresh one.
  idempotencyKey.value = crypto.randomUUID()
  result.value = null
  kioskRequest.value = null
  selectedPatient.value = null
  newPatient.value = emptyPerson()
  patientMode.value = 'new'
  duplicates.value = []
  lines.value = []
  method.value = 'CASH'
  paidAmount.value = 0
  paidTouched.value = false
  contractNumber.value = ''
  contractOrganization.value = ''
  note.value = ''
  step.value = 0
  void router.replace({ path: '/registrar/checkout' })
}
</script>

<template>
  <AppPage :title="kioskRequest ? t('checkout.titleRequest', { n: kioskRequest.number }) : t('nav.newRegistration')">
    <template #actions>
      <UButton v-if="step < 3" to="/registrar" color="neutral" variant="ghost" icon="i-lucide-arrow-left" :label="t('nav.requests')" />
    </template>

    <UStepper v-model="step" :items="steps" :linear="true" disabled class="mb-6 no-print" />

    <div v-if="bootLoading" class="grid gap-6 lg:grid-cols-[1fr_360px]">
      <USkeleton class="h-96 rounded-xl" />
      <USkeleton class="h-72 rounded-xl" />
    </div>

    <!-- STEP 4: done -->
    <div v-else-if="step === 3 && result" class="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div class="space-y-6 no-print">
        <UCard>
          <div class="flex items-start gap-4">
            <div class="grid size-12 shrink-0 place-items-center rounded-full bg-success/10 text-success">
              <UIcon name="i-lucide-check-circle-2" class="size-7" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-highlighted">{{ t('checkout.successTitle') }}</h2>
              <p class="text-muted">{{ t('checkout.successText', { name: personName(result.patient, true), code: result.patient.patientCode }) }}</p>
            </div>
          </div>
        </UCard>
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="tk in result.tickets" :key="tk.id" class="rounded-xl border border-default bg-default p-5 text-center">
            <p class="text-xs uppercase tracking-widest text-muted">{{ t('receipt.queueNumber') }}</p>
            <p class="my-2 font-mono text-6xl font-black tracking-tight text-primary">{{ tk.ticketNumber }}</p>
            <p class="text-lg font-semibold text-highlighted">{{ t('receipt.room', { room: tk.roomNumber ?? '—' }) }}</p>
            <p class="text-sm text-muted">{{ doctorName(tk.doctor) }}</p>
            <p class="mt-2 text-xs text-dimmed">{{ tk.services.map((s) => s.name).join(', ') }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton size="lg" icon="i-lucide-user-plus" :label="t('checkout.nextPatient')" @click="nextPatient" />
          <UButton size="lg" to="/registrar" color="neutral" variant="outline" icon="i-lucide-inbox" :label="t('nav.requests')" />
        </div>
      </div>
      <ReceiptView :receipt="result.receipt" :payment-id="result.payment.id" />
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div class="min-w-0 space-y-6">
        <!-- STEP 1: patient -->
        <template v-if="step === 0">
          <UCard v-if="kioskRequest" :ui="{ body: 'p-4' }" class="border-info/40 bg-info/5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-monitor-smartphone" class="size-5 text-info" />
                <div>
                  <p class="font-medium text-highlighted">{{ t('checkout.fromKiosk', { n: kioskRequest.number }) }}</p>
                  <p class="text-sm text-muted">{{ personName(kioskRequest, true) }} · {{ kioskRequest.phone }}<template v-if="kioskRequest.birthDate"> · {{ formatDate(kioskRequest.birthDate) }}</template></p>
                </div>
              </div>
              <MoneyText :value="kioskRequest.totalAmount" class="font-semibold" />
            </div>
          </UCard>

          <PageSection v-if="duplicates.length" :title="t('checkout.matches')" :description="t('checkout.matchesHint')" icon="i-lucide-users">
            <div class="space-y-2">
              <button
                v-for="p in duplicates"
                :key="p.id"
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition"
                :class="selectedPatient?.id === p.id && patientMode === 'existing' ? 'border-primary bg-primary/5' : 'border-default hover:bg-elevated/50'"
                @click="selectPatient(p)"
              >
                <span class="flex items-center gap-3">
                  <UAvatar :src="p.avatar ?? undefined" :alt="personName(p)" />
                  <span>
                    <span class="block font-medium">{{ personName(p, true) }}</span>
                    <span class="block text-xs text-muted">{{ p.patientCode }} · {{ p.phone }} · {{ formatDate(p.birthDate) }}</span>
                  </span>
                </span>
                <UIcon v-if="selectedPatient?.id === p.id && patientMode === 'existing'" name="i-lucide-check-circle-2" class="size-5 text-primary" />
              </button>
            </div>
          </PageSection>

          <UCard>
            <UTabs
              v-model="patientMode"
              :items="[
                { label: t('checkout.newPatient'), value: 'new', icon: 'i-lucide-user-plus' },
                { label: t('checkout.existingPatient'), value: 'existing', icon: 'i-lucide-user-search' },
              ]"
              :content="false"
              class="mb-5"
            />
            <div v-if="patientMode === 'existing'" class="space-y-4">
              <UInput v-model="patientSearch" icon="i-lucide-search" size="lg" :loading="searching" :placeholder="t('patients.searchPlaceholder')" class="w-full" autofocus />
              <div v-if="selectedPatient" class="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
                <span class="flex items-center gap-3">
                  <UAvatar :src="selectedPatient.avatar ?? undefined" :alt="personName(selectedPatient)" />
                  <span>
                    <span class="block font-medium">{{ personName(selectedPatient, true) }}</span>
                    <span class="block text-xs text-muted">{{ selectedPatient.patientCode }} · {{ selectedPatient.phone }}</span>
                  </span>
                </span>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" :aria-label="t('common.clear')" @click="selectedPatient = null" />
              </div>
              <ul v-if="searchResults.length" class="divide-y divide-default rounded-lg border border-default">
                <li v-for="p in searchResults" :key="p.id">
                  <button type="button" class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-elevated/50" @click="selectPatient(p)">
                    <span>
                      <span class="block font-medium">{{ personName(p, true) }}</span>
                      <span class="block text-xs text-muted">{{ p.patientCode }} · {{ p.phone }} · {{ formatDate(p.birthDate) }}</span>
                    </span>
                    <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed" />
                  </button>
                </li>
              </ul>
              <p v-else-if="patientSearch.trim().length >= 2 && !searching" class="text-sm text-muted">{{ t('patients.notFound') }}</p>
            </div>
            <UForm v-else :state="newPatient" :validate="patientFormValidate" :validate-on="['blur']">
              <PersonFields v-model="newPatient" show-passport show-profession phone-required />
            </UForm>
          </UCard>
        </template>

        <!-- STEP 2: services -->
        <PageSection v-else-if="step === 1" :title="t('checkout.services')" :description="t('checkout.servicesHint')" icon="i-lucide-clipboard-list">
          <template #actions>
            <UButton icon="i-lucide-plus" :label="t('checkout.addServices')" @click="openPicker" />
          </template>
          <EmptyState v-if="!lines.length" :title="t('checkout.noServices')" icon="i-lucide-clipboard-x" compact>
            <UButton icon="i-lucide-plus" :label="t('checkout.addServices')" @click="openPicker" />
          </EmptyState>
          <ul v-else class="divide-y divide-default">
            <li v-for="(line, idx) in lines" :key="line.serviceId" class="grid gap-3 py-3 sm:grid-cols-[1fr_280px_auto] sm:items-center">
              <template v-if="serviceMap.get(line.serviceId)">
                <div class="min-w-0">
                  <p class="truncate font-medium text-highlighted">{{ serviceName(serviceMap.get(line.serviceId)!) }}</p>
                  <p class="text-xs text-muted">{{ serviceMap.get(line.serviceId)!.departmentName }} · {{ serviceMap.get(line.serviceId)!.code }}</p>
                  <MoneyText :value="serviceMap.get(line.serviceId)!.price" class="text-sm font-semibold" />
                </div>
                <USelect
                  v-model="line.doctorId"
                  :items="doctorsFor(line.serviceId).map((d) => ({ value: d.id, label: `${doctorName(d)} · ${t('queues.roomShort', { room: d.roomNumber })}` }))"
                  :placeholder="doctorsFor(line.serviceId).length ? t('checkout.chooseDoctor') : t('checkout.noDoctor')"
                  :disabled="!doctorsFor(line.serviceId).length"
                  :color="line.doctorId ? 'neutral' : 'warning'"
                  icon="i-lucide-stethoscope"
                  class="w-full"
                />
              </template>
              <div v-else class="sm:col-span-2">
                <UAlert color="error" variant="subtle" icon="i-lucide-ban" :title="t('checkout.serviceUnavailable')" />
              </div>
              <UButton color="error" variant="ghost" icon="i-lucide-trash-2" :aria-label="t('common.remove')" class="justify-self-end" @click="removeLine(idx)" />
            </li>
          </ul>
        </PageSection>

        <!-- STEP 3: payment -->
        <PageSection v-else :title="t('checkout.payment')" icon="i-lucide-wallet">
          <div class="space-y-5">
            <URadioGroup v-model="method" :items="methodItems" variant="card" orientation="horizontal" indicator="hidden" :ui="{ fieldset: 'grid gap-3 sm:grid-cols-3', item: 'items-center' }">
              <template #label="{ item }">
                <span class="flex items-center gap-2 font-semibold"><UIcon :name="item.icon" class="size-5" />{{ item.label }}</span>
              </template>
            </URadioGroup>
            <div v-if="method === 'CONTRACT'" class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="t('payments.contractNumber')" required>
                <UInput v-model="contractNumber" icon="i-lucide-file-signature" class="w-full" />
              </UFormField>
              <UFormField :label="t('checkout.organization')">
                <UInput v-model="contractOrganization" icon="i-lucide-building" class="w-full" />
              </UFormField>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="t('checkout.paidAmount')" :hint="t('checkout.partialHint')">
                <UInputNumber
                  :model-value="paidAmount"
                  :min="0"
                  :max="total"
                  :step="1000"
                  size="lg"
                  class="w-full"
                  :format-options="{ useGrouping: true, maximumFractionDigits: 0 }"
                  @update:model-value="setPaid"
                />
              </UFormField>
              <div class="flex items-end gap-2">
                <UButton color="neutral" variant="outline" :label="t('checkout.fullAmount')" @click="setPaid(total)" />
                <UButton color="neutral" variant="outline" :label="t('checkout.zeroAmount')" @click="setPaid(0)" />
              </div>
            </div>
            <UAlert v-if="remaining > 0" color="warning" variant="subtle" icon="i-lucide-hourglass" :title="t('checkout.partialWarning', { amount: format(remaining) })" />
            <UFormField :label="t('payments.note')">
              <UTextarea v-model="note" :rows="2" class="w-full" />
            </UFormField>
          </div>
        </PageSection>
      </div>

      <!-- Summary -->
      <aside class="lg:sticky lg:top-4 lg:self-start">
        <UCard :ui="{ body: 'p-4 sm:p-5' }">
          <h3 class="mb-4 font-semibold text-highlighted">{{ t('checkout.summary') }}</h3>
          <div class="space-y-1 text-sm">
            <p class="text-muted">{{ t('payments.patient') }}</p>
            <p class="font-medium text-highlighted">{{ patientDisplay || '—' }}</p>
            <p v-if="patientMode === 'existing' && selectedPatient" class="text-xs text-muted">
              {{ selectedPatient.patientCode }}<template v-if="age(selectedPatient.birthDate) !== null"> · {{ t('patients.years', { n: age(selectedPatient.birthDate) }) }}</template>
            </p>
            <UBadge v-else-if="patientMode === 'new'" color="info" variant="subtle" size="sm">{{ t('checkout.newPatient') }}</UBadge>
          </div>
          <USeparator class="my-4" />
          <ul class="space-y-2 text-sm">
            <li v-for="line in lines" :key="line.serviceId" class="flex justify-between gap-2">
              <span class="truncate">{{ serviceMap.get(line.serviceId) ? serviceName(serviceMap.get(line.serviceId)!) : '—' }}</span>
              <MoneyText :value="serviceMap.get(line.serviceId)?.price ?? 0" :currency="false" />
            </li>
            <li v-if="!lines.length" class="text-muted">{{ t('checkout.noServices') }}</li>
          </ul>
          <USeparator class="my-4" />
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{ t('common.total') }}</span>
              <MoneyText :value="total" class="text-xl font-bold text-primary" />
            </div>
            <template v-if="step === 2">
              <div class="flex justify-between text-sm"><span class="text-muted">{{ t('payments.method') }}</span><span>{{ labels.paymentMethod(method) }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-muted">{{ t('payments.paid') }}</span><MoneyText :value="paidAmount" /></div>
              <div v-if="remaining > 0" class="flex justify-between text-sm text-warning"><span>{{ t('payments.remaining') }}</span><MoneyText :value="remaining" /></div>
            </template>
          </div>
          <div class="mt-5 flex gap-2">
            <UButton v-if="step > 0" color="neutral" variant="outline" icon="i-lucide-arrow-left" :aria-label="t('common.back')" @click="back" />
            <UButton v-if="step < 2" class="flex-1" block size="lg" trailing-icon="i-lucide-arrow-right" :label="t('common.next')" @click="next" />
            <UButton
              v-else
              class="flex-1"
              block
              size="lg"
              color="success"
              icon="i-lucide-check"
              :loading="submitting"
              :disabled="submitting || !lines.length"
              :label="t('checkout.confirm')"
              @click="submit"
            />
          </div>
        </UCard>
      </aside>
    </div>

    <USlideover v-model:open="pickerOpen" :title="t('checkout.addServices')" :ui="{ content: 'max-w-3xl' }">
      <template #body>
        <ServicePicker v-model="pickerSelection" :departments="catalog.departments" :loading="catalogLoading" />
      </template>
      <template #footer>
        <div class="flex w-full items-center justify-between gap-2">
          <span class="text-sm text-muted">{{ t('checkout.selectedN', { n: pickerSelection.length }) }}</span>
          <div class="flex gap-2">
            <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="pickerOpen = false" />
            <UButton icon="i-lucide-check" :label="t('common.apply')" @click="applyPicker" />
          </div>
        </div>
      </template>
    </USlideover>
  </AppPage>
</template>
