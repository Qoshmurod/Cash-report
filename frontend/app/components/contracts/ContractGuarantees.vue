<script setup lang="ts">
import type { ContractDetail, ContractGuarantee, GuaranteePreview, GuaranteeStatus, GuaranteeTemplate } from '~/types/api'

/** Kafolat xatlari: enter a letter (compared with the template) → credit; approve / reject / revoke. */
const props = defineProps<{ contract: ContractDetail }>()
const emit = defineEmits<{ changed: [ContractDetail] }>()
const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()
const { format } = useMoney()
const { formatDate, formatDateTime } = useDate()

const canEnter = computed(() => auth.can('contract_credit'))
const canApprove = computed(() => auth.can('contract_credit_approve'))
const STATUS_COLOR: Record<GuaranteeStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  REVOKED: 'neutral',
}

const templates = ref<GuaranteeTemplate[]>([])
async function loadTemplates() {
  if (!canEnter.value && !canApprove.value) return
  templates.value = await api.get<GuaranteeTemplate[]>('/contracts/guarantee-templates')
}
onMounted(loadTemplates)
const templateItems = computed(() => templates.value.filter((x) => x.isActive).map((x) => ({ value: x.id, label: x.name })))

const reserved = computed(() => props.contract.guarantees.filter((g) => g.status === 'APPROVED' || g.status === 'PENDING').reduce((s, g) => s + g.amount, 0))
const maxAmount = computed(() => Math.max(0, (props.contract.unpaid ?? 0) - reserved.value))

const formOpen = ref(false)
const busy = ref(false)
const today = () => new Date().toISOString().slice(0, 10)
const form = reactive({ templateId: undefined as string | undefined, letterNumber: '', letterDate: today(), amount: 0, validUntil: '', body: '' })
const preview = ref<GuaranteePreview | null>(null)

function openForm() {
  Object.assign(form, { templateId: templateItems.value[0]?.value, letterNumber: '', letterDate: today(), amount: maxAmount.value, validUntil: '', body: '' })
  preview.value = null
  formOpen.value = true
}
const payload = () => ({
  templateId: form.templateId,
  letterNumber: form.letterNumber.trim(),
  letterDate: form.letterDate,
  amount: form.amount,
  validUntil: form.validUntil || null,
  body: form.body,
})
async function compare() {
  if (!form.letterNumber.trim() || !form.amount) return
  preview.value = await api.post<GuaranteePreview>(`/contracts/${props.contract.id}/guarantees/preview`, { ...payload(), body: form.body || '..........' })
}
const compareSoon = useDebounceFn(compare, 600)
watch(() => [form.body, form.amount, form.letterNumber, form.letterDate, form.templateId], () => void compareSoon())

async function submit() {
  busy.value = true
  try {
    const c = await api.post<ContractDetail>(`/contracts/${props.contract.id}/guarantees`, payload())
    const g = c.guarantees[0]
    toast.add({
      title: g?.status === 'APPROVED' ? t('guarantees.createdApproved', { amount: format(g.amount) }) : t('guarantees.createdPending'),
      color: g?.status === 'APPROVED' ? 'success' : 'warning',
      icon: g?.status === 'APPROVED' ? 'i-lucide-check' : 'i-lucide-hourglass',
    })
    formOpen.value = false
    emit('changed', c)
  } finally {
    busy.value = false
  }
}

async function decide(g: ContractGuarantee, action: 'approve' | 'reject' | 'revoke') {
  const r = await confirm({
    title: t(`guarantees.${action}Title`, { n: g.letterNumber }),
    description: t(`guarantees.${action}Description`, { amount: format(g.amount) }),
    confirmLabel: t(`guarantees.${action}`),
    color: action === 'approve' ? 'success' : 'error',
    icon: action === 'approve' ? 'i-lucide-shield-check' : 'i-lucide-shield-x',
    inputLabel: t('payments.note'),
    inputRequired: action !== 'approve',
  })
  if (!r.confirmed) return
  const c = await api.post<ContractDetail>(`/contracts/${props.contract.id}/guarantees/${g.id}/${action}`, { note: r.value || undefined })
  toast.add({ title: t(`guarantees.${action}Done`), color: 'success', icon: 'i-lucide-check' })
  emit('changed', c)
}

const expanded = ref<string | null>(null)
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
      <div class="rounded-lg bg-elevated/60 p-2.5">
        <p class="text-xs text-muted">{{ t('guarantees.contractAmount') }}</p>
        <p class="font-semibold tabular">{{ props.contract.contractAmount != null ? format(props.contract.contractAmount) : '—' }}</p>
      </div>
      <div class="rounded-lg bg-elevated/60 p-2.5">
        <p class="text-xs text-muted">{{ t('guarantees.unpaid') }}</p>
        <p class="font-semibold tabular">{{ props.contract.unpaid != null ? format(props.contract.unpaid) : '—' }}</p>
      </div>
      <div class="rounded-lg bg-success/10 p-2.5">
        <p class="text-xs text-muted">{{ t('guarantees.creditLimit') }}</p>
        <p class="font-semibold tabular text-success">{{ format(props.contract.credit) }}</p>
      </div>
      <div class="rounded-lg p-2.5" :class="props.contract.debt > 0 ? 'bg-error/10' : 'bg-elevated/60'">
        <p class="text-xs text-muted">{{ t('guarantees.debt') }}</p>
        <p class="font-semibold tabular" :class="props.contract.debt > 0 ? 'text-error' : ''">{{ format(props.contract.debt) }}</p>
      </div>
    </div>

    <UAlert v-if="props.contract.contractAmount == null" color="info" variant="subtle" icon="i-lucide-info" :title="t('guarantees.needAmount')" />
    <div v-else-if="canEnter" class="flex justify-end">
      <UButton icon="i-lucide-file-plus-2" :disabled="maxAmount <= 0" :label="t('guarantees.add')" @click="openForm" />
    </div>
    <UAlert v-else color="neutral" variant="subtle" icon="i-lucide-lock" :title="t('guarantees.noPermission')" />

    <ul v-if="props.contract.guarantees.length" class="space-y-2">
      <li v-for="g in props.contract.guarantees" :key="g.id" class="rounded-lg border border-default p-3 text-sm">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-semibold text-highlighted">
              № {{ g.letterNumber }} · {{ formatDate(g.letterDate) }}
              <span v-if="g.validUntil" class="font-normal text-muted"> · {{ t('guarantees.validUntilShort', { d: formatDate(g.validUntil) }) }}</span>
            </p>
            <p class="text-xs text-muted">{{ personName(g.createdBy) }} · {{ formatDateTime(g.createdAt) }}<template v-if="g.template"> · {{ g.template.name }}</template></p>
          </div>
          <div class="flex items-center gap-2">
            <MoneyText :value="g.amount" class="font-semibold" />
            <UBadge :color="STATUS_COLOR[g.status]" variant="subtle">{{ t(`guarantees.status.${g.status}`) }}</UBadge>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <UBadge :color="g.templateMatched ? 'success' : 'warning'" variant="outline" :icon="g.templateMatched ? 'i-lucide-check' : 'i-lucide-triangle-alert'">
            {{ g.templateMatched ? t('guarantees.matched') : t('guarantees.notMatched') }} · {{ g.similarity }}%
          </UBadge>
          <span v-if="g.decidedBy" class="text-muted">{{ t('guarantees.decidedBy', { name: personName(g.decidedBy) }) }}</span>
          <span v-if="g.decisionNote" class="text-muted">· {{ g.decisionNote }}</span>
          <UButton size="xs" color="neutral" variant="link" :label="expanded === g.id ? t('guarantees.hideText') : t('guarantees.showText')" @click="expanded = expanded === g.id ? null : g.id" />
        </div>
        <div v-if="expanded === g.id" class="mt-2 space-y-2">
          <pre class="max-h-60 overflow-auto whitespace-pre-wrap rounded bg-elevated/60 p-2 text-xs">{{ g.body }}</pre>
          <div v-if="g.missingLines.length" class="rounded border border-warning/40 p-2 text-xs">
            <p class="mb-1 font-medium text-warning">{{ t('guarantees.missingLines') }}</p>
            <ul class="list-disc space-y-0.5 pl-4">
              <li v-for="(l, i) in g.missingLines" :key="i">{{ l }}</li>
            </ul>
          </div>
        </div>
        <div v-if="canApprove && (g.status === 'PENDING' || g.status === 'APPROVED')" class="mt-2 flex flex-wrap justify-end gap-2">
          <template v-if="g.status === 'PENDING'">
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" :label="t('guarantees.reject')" @click="decide(g, 'reject')" />
            <UButton size="xs" color="success" icon="i-lucide-shield-check" :label="t('guarantees.approve')" @click="decide(g, 'approve')" />
          </template>
          <UButton v-else size="xs" color="error" variant="ghost" icon="i-lucide-shield-off" :label="t('guarantees.revoke')" @click="decide(g, 'revoke')" />
        </div>
      </li>
    </ul>
    <EmptyState v-else icon="i-lucide-file-check-2" :title="t('guarantees.empty')" :description="t('guarantees.emptyHint')" />

    <UModal v-model:open="formOpen" :title="t('guarantees.add')" :description="t('guarantees.formHint', { max: format(maxAmount) })" :ui="{ content: 'max-w-3xl' }">
      <template #body>
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField :label="t('guarantees.template')" class="sm:col-span-2">
            <USelect id="g-template" v-model="form.templateId" :items="templateItems" class="w-full" :placeholder="t('guarantees.noTemplate')" />
          </UFormField>
          <UFormField :label="t('guarantees.letterNumber')" required>
            <UInput id="g-number" v-model="form.letterNumber" placeholder="KX-15" class="w-full" />
          </UFormField>
          <UFormField :label="t('guarantees.letterDate')" required>
            <UInput id="g-date" v-model="form.letterDate" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('guarantees.amount')" required :hint="t('guarantees.max', { max: format(maxAmount) })">
            <UInputNumber id="g-amount" v-model="form.amount" :min="1" :max="maxAmount" :step="100000" class="w-full" :format-options="{ useGrouping: true, maximumFractionDigits: 0 }" />
          </UFormField>
          <UFormField :label="t('guarantees.validUntil')">
            <UInput id="g-valid" v-model="form.validUntil" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('guarantees.body')" required class="sm:col-span-2">
            <UTextarea id="g-body" v-model="form.body" :rows="8" class="w-full font-mono text-xs" :placeholder="t('guarantees.bodyPlaceholder')" />
          </UFormField>
          <div v-if="preview && form.body" class="space-y-2 sm:col-span-2">
            <UAlert
              :color="preview.matched ? 'success' : 'warning'"
              variant="subtle"
              :icon="preview.matched ? 'i-lucide-shield-check' : 'i-lucide-triangle-alert'"
              :title="preview.matched ? t('guarantees.previewMatched', { p: preview.similarity }) : t('guarantees.previewNotMatched', { p: preview.similarity })"
              :description="preview.matched ? t('guarantees.willOpen') : t('guarantees.willWait')"
            />
            <ul v-if="preview.missingLines.length" class="list-disc space-y-0.5 rounded border border-warning/40 py-2 pl-6 pr-2 text-xs">
              <li v-for="(l, i) in preview.missingLines" :key="i">{{ l }}</li>
            </ul>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="formOpen = false" />
          <UButton
            :loading="busy"
            :disabled="!form.letterNumber.trim() || !form.amount || form.amount > maxAmount || form.body.trim().length < 10"
            icon="i-lucide-check"
            :label="t('guarantees.submit')"
            @click="submit"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
