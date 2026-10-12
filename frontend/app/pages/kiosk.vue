<script setup lang="ts">
import type { Gender, KioskCatalog, KioskCatalogDepartment, KioskRequest, Service } from '~/types/api'
import { ApiError } from '~/utils/api-error'
import { KIOSK_IDLE_MS, KIOSK_SUCCESS_RESET_MS } from '~/utils/constants'
import { formatUzPhone, isValidUzPhone, normalizePhone } from '~/utils/phone'

definePageMeta({ roles: ['KIOSK', 'ADMIN'], layout: 'kiosk', titleKey: 'kiosk.title' })

type Step = 0 | 1 | 2 | 3 | 4 | 5 // 5 = success

const { t, locale, setLocale } = useI18n()
const api = useApi()
const settings = useSettingsStore()
const { formatAmount } = useMoney()
const logout = useLogout()

const step = ref<Step>(0)
const catalog = ref<KioskCatalog>({ departments: [] })
const loading = ref(true)
const error = ref<ApiError | null>(null)
const activeDepartment = ref<KioskCatalogDepartment | null>(null)
const selected = ref<string[]>([])
const form = reactive<{ lastName: string; firstName: string; middleName: string; phone: string; birthDate: string; gender: Gender | undefined }>({
  lastName: '',
  firstName: '',
  middleName: '',
  phone: '+998 ',
  birthDate: '',
  gender: undefined,
})
const touched = ref(false)
const submitting = ref(false)
const submitError = ref(false)
const created = ref<KioskRequest | null>(null)
const countdown = ref(0)

async function loadCatalog() {
  loading.value = true
  error.value = null
  try {
    catalog.value = await api.get<KioskCatalog>('/kiosk/catalog')
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', String(e))
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  void loadCatalog()
  void settings.loadPublic()
})
// Keep prices / availability fresh on a long-running kiosk
useIntervalFn(() => {
  if (step.value === 0) void loadCatalog()
}, 5 * 60_000)

const name = (x: { name: string; nameRu: string | null }) => (locale.value === 'ru' && x.nameRu ? x.nameRu : x.name)
const allServices = computed(() => {
  const m = new Map<string, Service>()
  for (const d of catalog.value.departments) for (const s of d.services) m.set(s.id, s)
  return m
})
const selectedServices = computed(() => selected.value.map((id) => allServices.value.get(id)).filter((s): s is Service => !!s))
const total = computed(() => selectedServices.value.reduce((sum, s) => sum + s.price, 0))

// ─── Department visuals ───
const DEP_ICONS: [RegExp, string][] = [
  [/card|kard|heart|серд/i, 'i-lucide-heart-pulse'],
  [/lab/i, 'i-lucide-flask-conical'],
  [/uzi|usd|ultra|узи/i, 'i-lucide-scan-line'],
  [/neur|nevr|невр/i, 'i-lucide-brain'],
  [/ther|terap|терап/i, 'i-lucide-stethoscope'],
  [/dent|stom|стом/i, 'i-lucide-smile'],
  [/ped|pedi|педи/i, 'i-lucide-baby'],
  [/eye|oft|окул|офт/i, 'i-lucide-eye'],
  [/xray|rent|рент|mrt|mri|kt/i, 'i-lucide-radiation'],
  [/surg|xirurg|хирур/i, 'i-lucide-syringe'],
]
const DEP_TONES = [
  'from-rose-500 to-pink-600',
  'from-sky-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-pink-600',
  'from-lime-500 to-green-600',
]
function depIcon(d: KioskCatalogDepartment) {
  const key = `${d.code} ${d.name} ${d.nameRu ?? ''}`
  return DEP_ICONS.find(([re]) => re.test(key))?.[1] ?? 'i-lucide-hospital'
}
const depTone = (i: number) => DEP_TONES[i % DEP_TONES.length]
const selectedIn = (d: KioskCatalogDepartment) => d.services.filter((s) => selected.value.includes(s.id)).length

// ─── Flow ───
function openDepartment(d: KioskCatalogDepartment) {
  activeDepartment.value = d
  step.value = 1
}
function toggle(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}
function remove(id: string) {
  selected.value = selected.value.filter((x) => x !== id)
  if (!selected.value.length) step.value = 0
}

const errors = computed(() => ({
  lastName: !form.lastName.trim(),
  firstName: !form.firstName.trim(),
  phone: !isValidUzPhone(form.phone),
}))
const formValid = computed(() => !errors.value.lastName && !errors.value.firstName && !errors.value.phone)

function onPhoneInput(v: string | number) {
  form.phone = formatUzPhone(String(v))
}

function goBack() {
  // services & summary both return to the department grid; later steps go one back
  step.value = step.value <= 2 ? 0 : ((step.value - 1) as Step)
}
function goInfo() {
  step.value = 3
}
function goConfirm() {
  touched.value = true
  if (formValid.value) step.value = 4
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  submitError.value = false
  try {
    created.value = await api.post<KioskRequest>(
      '/kiosk/requests',
      {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        middleName: form.middleName.trim() || undefined,
        phone: normalizePhone(form.phone),
        birthDate: form.birthDate || undefined,
        gender: form.gender,
        serviceIds: selected.value,
      },
      { toastError: false },
    )
    step.value = 5
    countdown.value = Math.round(KIOSK_SUCCESS_RESET_MS / 1000)
  } catch {
    submitError.value = true
  } finally {
    submitting.value = false
  }
}

function reset() {
  step.value = 0
  activeDepartment.value = null
  selected.value = []
  Object.assign(form, { lastName: '', firstName: '', middleName: '', phone: '+998 ', birthDate: '', gender: undefined })
  touched.value = false
  created.value = null
  submitError.value = false
}

// Success screen countdown → reset
useIntervalFn(() => {
  if (step.value !== 5) return
  countdown.value -= 1
  if (countdown.value <= 0) reset()
}, 1000)

// Idle timeout → back to start (patient walked away)
const { idle } = useIdle(KIOSK_IDLE_MS)
watch(idle, (isIdle) => {
  if (isIdle && step.value !== 0 && step.value !== 5) reset()
})

const stepsBar = computed(() => [t('kiosk.steps.department'), t('kiosk.steps.services'), t('kiosk.steps.summary'), t('kiosk.steps.info'), t('kiosk.steps.confirm')])

// Staff menu: long-press on logo (hidden from patients)
const logoRef = ref<HTMLElement | null>(null)
const staffOpen = ref(false)
onLongPress(logoRef, () => (staffOpen.value = true), { delay: 2500 })

const genderItems = computed(() => [
  { value: 'MALE' as const, label: t('enums.gender.MALE'), icon: 'i-lucide-user' },
  { value: 'FEMALE' as const, label: t('enums.gender.FEMALE'), icon: 'i-lucide-user-round' },
])
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-5 sm:px-8 sm:py-8">
    <!-- Header -->
    <header class="flex items-center justify-between gap-4">
      <div ref="logoRef" class="select-none">
        <AppLogo />
      </div>
      <div class="flex gap-2" role="group" :aria-label="t('common.language')">
        <button
          v-for="l in ['uz', 'ru'] as const"
          :key="l"
          type="button"
          class="h-14 min-w-20 rounded-2xl border-2 px-5 text-lg font-bold transition active:scale-95"
          :class="locale === l ? 'border-primary bg-primary text-white' : 'border-default bg-default text-highlighted'"
          :aria-pressed="locale === l"
          @click="setLocale(l)"
        >
          {{ l === 'uz' ? "O'zb" : 'Рус' }}
        </button>
      </div>
    </header>

    <!-- Progress -->
    <nav v-if="step < 5" class="mt-6" :aria-label="t('kiosk.progress')">
      <ol class="grid grid-cols-5 gap-2">
        <li v-for="(label, i) in stepsBar" :key="label" class="flex flex-col gap-2">
          <div class="h-2 rounded-full transition-colors" :class="i <= step ? 'bg-primary' : 'bg-accented'" />
          <span class="hidden text-sm font-medium sm:block" :class="i === step ? 'text-primary' : 'text-muted'">{{ i + 1 }}. {{ label }}</span>
        </li>
      </ol>
    </nav>

    <main class="mt-6 flex flex-1 flex-col">
      <!-- Loading / error -->
      <div v-if="loading && !catalog.departments.length" class="grid flex-1 grid-cols-2 gap-5 lg:grid-cols-3">
        <USkeleton v-for="i in 6" :key="i" class="h-44 rounded-3xl" />
      </div>
      <div v-else-if="error && !catalog.departments.length" class="flex flex-1 flex-col items-center justify-center text-center">
        <UIcon name="i-lucide-wifi-off" class="size-20 text-error" />
        <p class="mt-6 text-3xl font-bold text-highlighted">{{ t('kiosk.offline') }}</p>
        <UButton size="xl" class="mt-8 h-16 px-10 text-xl" icon="i-lucide-refresh-cw" :label="t('common.retry')" @click="loadCatalog" />
      </div>

      <!-- STEP 0: departments -->
      <section v-else-if="step === 0" class="flex flex-1 flex-col">
        <h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-5xl">{{ t('kiosk.chooseDepartment') }}</h1>
        <p class="mt-2 text-lg text-muted sm:text-xl">{{ t('kiosk.chooseDepartmentHint') }}</p>
        <div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="(d, i) in catalog.departments"
            :key="d.id"
            type="button"
            class="group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-left text-white shadow-lg transition active:scale-[0.98]"
            :class="depTone(i)"
            @click="openDepartment(d)"
          >
            <UIcon :name="depIcon(d)" class="absolute -right-4 -bottom-4 size-32 opacity-15" />
            <div class="grid size-16 place-items-center rounded-2xl bg-white/20">
              <UIcon :name="depIcon(d)" class="size-9" />
            </div>
            <div>
              <p class="text-2xl font-bold leading-tight">{{ name(d) }}</p>
              <p class="mt-1 text-white/85">{{ t('kiosk.servicesCount', { n: d.services.length }) }}</p>
            </div>
            <span v-if="selectedIn(d)" class="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white text-lg font-bold text-primary">{{ selectedIn(d) }}</span>
          </button>
        </div>
        <p v-if="!catalog.departments.length" class="mt-10 text-center text-xl text-muted">{{ t('kiosk.noServices') }}</p>
      </section>

      <!-- STEP 1: services -->
      <section v-else-if="step === 1 && activeDepartment" class="flex flex-1 flex-col">
        <h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">{{ name(activeDepartment) }}</h1>
        <p class="mt-2 text-lg text-muted">{{ t('kiosk.chooseServices') }}</p>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <button
            v-for="s in activeDepartment.services"
            :key="s.id"
            type="button"
            class="flex min-h-24 items-center justify-between gap-4 rounded-2xl border-2 bg-default p-5 text-left transition active:scale-[0.99]"
            :class="selected.includes(s.id) ? 'border-primary ring-4 ring-primary/15' : 'border-default'"
            :aria-pressed="selected.includes(s.id)"
            @click="toggle(s.id)"
          >
            <div class="flex items-center gap-4">
              <span class="grid size-12 shrink-0 place-items-center rounded-xl border-2 transition" :class="selected.includes(s.id) ? 'border-primary bg-primary text-white' : 'border-accented'">
                <UIcon v-if="selected.includes(s.id)" name="i-lucide-check" class="size-7" />
              </span>
              <span>
                <span class="block text-xl font-semibold text-highlighted">{{ name(s) }}</span>
                <span v-if="s.description" class="line-clamp-1 block text-muted">{{ s.description }}</span>
              </span>
            </div>
            <span class="shrink-0 text-xl font-bold text-primary tabular">{{ formatAmount(s.price) }}</span>
          </button>
        </div>
      </section>

      <!-- STEP 2: summary -->
      <section v-else-if="step === 2" class="flex flex-1 flex-col">
        <h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">{{ t('kiosk.selectedServices') }}</h1>
        <div class="mt-6 overflow-hidden rounded-3xl border border-default bg-default">
          <ul class="divide-y divide-default">
            <li v-for="s in selectedServices" :key="s.id" class="flex items-center justify-between gap-4 px-6 py-5">
              <span class="text-xl font-medium">{{ name(s) }}</span>
              <span class="flex items-center gap-4">
                <span class="text-xl font-semibold tabular">{{ formatAmount(s.price) }}</span>
                <button type="button" class="grid size-12 place-items-center rounded-xl bg-error/10 text-error active:scale-95" :aria-label="t('common.remove')" @click="remove(s.id)">
                  <UIcon name="i-lucide-x" class="size-6" />
                </button>
              </span>
            </li>
          </ul>
          <div class="flex items-center justify-between border-t-2 border-dashed border-accented bg-elevated/50 px-6 py-6">
            <span class="text-2xl font-bold">{{ t('kiosk.total') }}</span>
            <span class="text-3xl font-black text-primary tabular">{{ formatAmount(total) }} {{ settings.currency }}</span>
          </div>
        </div>
        <p class="mt-4 text-lg text-muted">{{ t('kiosk.priceNote') }}</p>
      </section>

      <!-- STEP 3: patient info -->
      <section v-else-if="step === 3" class="flex flex-1 flex-col">
        <h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">{{ t('kiosk.yourData') }}</h1>
        <p class="mt-2 text-lg text-muted">{{ t('kiosk.yourDataHint') }}</p>
        <div class="mt-6 grid gap-5 md:grid-cols-2">
          <label class="block">
            <span class="mb-2 block text-lg font-semibold">{{ t('person.lastName') }} *</span>
            <UInput v-model="form.lastName" size="xl" class="w-full" :ui="{ base: 'h-16 text-xl' }" autocomplete="off" :color="touched && errors.lastName ? 'error' : 'primary'" :highlight="touched && errors.lastName" />
          </label>
          <label class="block">
            <span class="mb-2 block text-lg font-semibold">{{ t('person.firstName') }} *</span>
            <UInput v-model="form.firstName" size="xl" class="w-full" :ui="{ base: 'h-16 text-xl' }" autocomplete="off" :color="touched && errors.firstName ? 'error' : 'primary'" :highlight="touched && errors.firstName" />
          </label>
          <label class="block">
            <span class="mb-2 block text-lg font-semibold">{{ t('person.middleName') }}</span>
            <UInput v-model="form.middleName" size="xl" class="w-full" :ui="{ base: 'h-16 text-xl' }" autocomplete="off" />
          </label>
          <label class="block">
            <span class="mb-2 block text-lg font-semibold">{{ t('person.phone') }} *</span>
            <UInput
              :model-value="form.phone"
              type="tel"
              inputmode="tel"
              size="xl"
              class="w-full"
              :ui="{ base: 'h-16 text-xl tabular' }"
              :color="touched && errors.phone ? 'error' : 'primary'"
              :highlight="touched && errors.phone"
              @update:model-value="onPhoneInput"
            />
            <span v-if="touched && errors.phone" class="mt-1 block text-error">{{ t('kiosk.phoneInvalid') }}</span>
          </label>
          <label class="block">
            <span class="mb-2 block text-lg font-semibold">{{ t('person.birthDate') }}</span>
            <UInput v-model="form.birthDate" type="date" size="xl" class="w-full" :ui="{ base: 'h-16 text-xl' }" :max="new Date().toISOString().slice(0, 10)" />
          </label>
          <div>
            <span class="mb-2 block text-lg font-semibold">{{ t('person.gender') }}</span>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="g in genderItems"
                :key="g.value"
                type="button"
                class="flex h-16 items-center justify-center gap-2 rounded-xl border-2 text-xl font-semibold transition active:scale-95"
                :class="form.gender === g.value ? 'border-primary bg-primary/10 text-primary' : 'border-default bg-default'"
                :aria-pressed="form.gender === g.value"
                @click="form.gender = form.gender === g.value ? undefined : g.value"
              >
                <UIcon :name="g.icon" class="size-6" />{{ g.label }}
              </button>
            </div>
          </div>
        </div>
        <p v-if="touched && !formValid" class="mt-4 text-lg text-error">{{ t('kiosk.fillRequired') }}</p>
      </section>

      <!-- STEP 4: confirm -->
      <section v-else-if="step === 4" class="flex flex-1 flex-col">
        <h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">{{ t('kiosk.confirmTitle') }}</h1>
        <div class="mt-6 grid gap-5 lg:grid-cols-2">
          <div class="rounded-3xl border border-default bg-default p-6">
            <p class="text-muted">{{ t('kiosk.patient') }}</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ form.lastName }} {{ form.firstName }} {{ form.middleName }}</p>
            <p class="mt-3 text-xl tabular">{{ form.phone }}</p>
            <p v-if="form.birthDate" class="mt-1 text-lg text-muted">{{ form.birthDate.split('-').reverse().join('.') }}</p>
            <p v-if="form.gender" class="text-lg text-muted">{{ t(`enums.gender.${form.gender}`) }}</p>
          </div>
          <div class="rounded-3xl border border-default bg-default p-6">
            <ul class="space-y-3">
              <li v-for="s in selectedServices" :key="s.id" class="flex justify-between gap-3 text-lg">
                <span>{{ name(s) }}</span>
                <span class="font-semibold tabular">{{ formatAmount(s.price) }}</span>
              </li>
            </ul>
            <div class="mt-4 flex justify-between border-t-2 border-dashed border-accented pt-4 text-2xl font-bold">
              <span>{{ t('kiosk.total') }}</span>
              <span class="text-primary tabular">{{ formatAmount(total) }} {{ settings.currency }}</span>
            </div>
          </div>
        </div>
        <UAlert v-if="submitError" class="mt-5" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="t('kiosk.submitError')" :ui="{ title: 'text-lg' }" />
      </section>

      <!-- SUCCESS -->
      <section v-else-if="step === 5 && created" class="flex flex-1 flex-col items-center justify-center text-center">
        <div class="grid size-28 place-items-center rounded-full bg-success/15 text-success animate-ticket-pop">
          <UIcon name="i-lucide-check" class="size-16" />
        </div>
        <p class="mt-8 text-2xl text-muted">{{ t('kiosk.requestNumber') }}</p>
        <p class="font-mono text-7xl font-black tracking-tight text-primary sm:text-8xl">#{{ created.number }}</p>
        <p class="mt-6 max-w-2xl text-3xl font-semibold text-highlighted">{{ t('kiosk.successText', { n: created.number }) }}</p>
        <p class="mt-3 text-xl text-muted">{{ t('kiosk.successTotal', { amount: `${formatAmount(created.totalAmount)} ${settings.currency}` }) }}</p>
        <UButton size="xl" class="mt-10 h-16 px-10 text-xl" icon="i-lucide-house" :label="t('kiosk.done', { n: countdown })" @click="reset" />
      </section>
    </main>

    <!-- Bottom action bar -->
    <footer v-if="step > 0 && step < 5" class="sticky bottom-0 mt-6 -mx-4 flex items-center justify-between gap-4 border-t border-default bg-default/90 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
      <button
        type="button"
        class="flex h-16 items-center gap-2 rounded-2xl border-2 border-default bg-default px-6 text-xl font-semibold active:scale-95"
        @click="goBack"
      >
        <UIcon name="i-lucide-arrow-left" class="size-6" />{{ t('common.back') }}
      </button>
      <div class="hidden text-right sm:block">
        <p class="text-muted">{{ t('kiosk.selectedN', { n: selected.length }) }}</p>
        <p class="text-2xl font-bold text-highlighted tabular">{{ formatAmount(total) }} {{ settings.currency }}</p>
      </div>
      <button
        v-if="step === 1"
        type="button"
        class="flex h-16 items-center gap-2 rounded-2xl bg-primary px-8 text-xl font-bold text-white shadow-lg disabled:opacity-40 active:scale-95"
        :disabled="!selected.length"
        @click="step = 2"
      >
        {{ t('common.next') }}<UIcon name="i-lucide-arrow-right" class="size-6" />
      </button>
      <div v-else-if="step === 2" class="flex gap-3">
        <button type="button" class="hidden h-16 items-center gap-2 rounded-2xl border-2 border-primary px-6 text-xl font-semibold text-primary active:scale-95 md:flex" @click="step = 0">
          <UIcon name="i-lucide-plus" class="size-6" />{{ t('kiosk.addMore') }}
        </button>
        <button type="button" class="flex h-16 items-center gap-2 rounded-2xl bg-primary px-8 text-xl font-bold text-white shadow-lg disabled:opacity-40 active:scale-95" :disabled="!selected.length" @click="goInfo">
          {{ t('common.next') }}<UIcon name="i-lucide-arrow-right" class="size-6" />
        </button>
      </div>
      <button v-else-if="step === 3" type="button" class="flex h-16 items-center gap-2 rounded-2xl bg-primary px-8 text-xl font-bold text-white shadow-lg active:scale-95" @click="goConfirm">
        {{ t('common.next') }}<UIcon name="i-lucide-arrow-right" class="size-6" />
      </button>
      <button
        v-else-if="step === 4"
        type="button"
        class="flex h-16 items-center gap-3 rounded-2xl bg-success px-10 text-xl font-bold text-white shadow-lg disabled:opacity-60 active:scale-95"
        :disabled="submitting"
        @click="submit"
      >
        <UIcon :name="submitting ? 'i-lucide-loader-circle' : 'i-lucide-send'" class="size-6" :class="submitting ? 'animate-spin' : ''" />
        {{ t('kiosk.send') }}
      </button>
    </footer>

    <!-- Selected badge on department screen -->
    <div v-if="step === 0 && selected.length" class="sticky bottom-4 mt-6 flex justify-center">
      <button type="button" class="flex h-18 items-center gap-4 rounded-full bg-primary py-4 pr-8 pl-4 text-xl font-bold text-white shadow-2xl active:scale-95" @click="step = 2">
        <span class="grid size-12 place-items-center rounded-full bg-white/20">{{ selected.length }}</span>
        {{ t('kiosk.continueWith', { amount: `${formatAmount(total)} ${settings.currency}` }) }}
        <UIcon name="i-lucide-arrow-right" class="size-6" />
      </button>
    </div>

    <UModal v-model:open="staffOpen" :title="t('kiosk.staffMenu')">
      <template #body>
        <div class="flex flex-col gap-2">
          <UButton color="neutral" variant="outline" size="lg" icon="i-lucide-refresh-cw" :label="t('common.refresh')" @click="() => { staffOpen = false; loadCatalog() }" />
          <UButton color="error" variant="soft" size="lg" icon="i-lucide-log-out" :label="t('auth.logout')" @click="logout()" />
        </div>
      </template>
    </UModal>
  </div>
</template>
