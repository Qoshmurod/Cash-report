<script setup lang="ts">
import type { Payment, PaymentMethod, Receipt } from '~/types/api'
import { PAYMENT_METHODS } from '~/types/api'

const props = defineProps<{ paymentId: string | null }>()
const emit = defineEmits<{ close: []; changed: [Payment] }>()
const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const labels = useLabels()
const { confirm } = useConfirm()
const { formatDateTime } = useDate()

const open = computed({
  get: () => !!props.paymentId,
  set: (v: boolean) => {
    if (!v) emit('close')
  },
})
const payment = ref<Payment | null>(null)
const receipt = ref<Receipt | null>(null)
const loading = ref(false)
const view = ref<'details' | 'receipt'>('details')
const busy = ref(false)

async function load() {
  if (!props.paymentId) return
  loading.value = true
  receipt.value = null
  view.value = 'details'
  try {
    payment.value = await api.get<Payment>(`/payments/${props.paymentId}`, undefined, { toastError: true })
  } catch {
    emit('close')
  } finally {
    loading.value = false
  }
}
watch(() => props.paymentId, load, { immediate: true })

async function showReceipt() {
  if (!payment.value) return
  view.value = 'receipt'
  if (!receipt.value) receipt.value = await api.get<Receipt>(`/payments/${payment.value.id}/receipt`, undefined, { toastError: true })
}

// Top-up (partial payment)
const payOpen = ref(false)
const pay = reactive<{ amount: number; method: PaymentMethod; note: string }>({ amount: 0, method: 'CASH', note: '' })
const methodItems = computed(() => PAYMENT_METHODS.map((m) => ({ value: m, label: labels.paymentMethod(m), icon: PAYMENT_METHOD_ICON[m] })))
function openPay() {
  if (!payment.value) return
  pay.amount = payment.value.remainingAmount
  pay.method = payment.value.method
  pay.note = ''
  payOpen.value = true
}
async function submitPay() {
  if (!payment.value) return
  busy.value = true
  try {
    payment.value = await api.post<Payment>(`/payments/${payment.value.id}/pay`, { amount: pay.amount, method: pay.method, note: pay.note || undefined })
    receipt.value = null
    payOpen.value = false
    toast.add({ title: t('toast.paymentSaved'), color: 'success', icon: 'i-lucide-check' })
    emit('changed', payment.value)
  } finally {
    busy.value = false
  }
}

async function refund() {
  if (!payment.value) return
  const r = await confirm({
    title: t('payments.refundTitle'),
    description: t('payments.refundDescription', { amount: useMoney().format(payment.value.paidAmount - payment.value.refundedAmount) }),
    confirmLabel: t('payments.refund'),
    color: 'warning',
    icon: 'i-lucide-undo-2',
    inputLabel: t('common.reason'),
    inputRequired: true,
  })
  if (!r.confirmed) return
  busy.value = true
  try {
    payment.value = await api.post<Payment>(`/payments/${payment.value.id}/refund`, { reason: r.value })
    toast.add({ title: t('toast.refunded'), color: 'success', icon: 'i-lucide-check' })
    emit('changed', payment.value)
  } finally {
    busy.value = false
  }
}

async function cancel() {
  if (!payment.value) return
  const r = await confirm({
    title: t('payments.cancelTitle'),
    description: t('payments.cancelDescription'),
    confirmLabel: t('payments.cancel'),
    color: 'error',
    icon: 'i-lucide-ban',
    inputLabel: t('common.reason'),
    inputRequired: true,
  })
  if (!r.confirmed) return
  busy.value = true
  try {
    payment.value = await api.post<Payment>(`/payments/${payment.value.id}/cancel`, { reason: r.value })
    toast.add({ title: t('toast.paymentCancelled'), color: 'success', icon: 'i-lucide-check' })
    emit('changed', payment.value)
  } finally {
    busy.value = false
  }
}

const canPay = computed(() => !!payment.value && payment.value.remainingAmount > 0 && ['UNPAID', 'PARTIALLY_PAID'].includes(payment.value.status))
const canRefund = computed(
  () => auth.hasRole('ADMIN') && !!payment.value && payment.value.paidAmount - payment.value.refundedAmount > 0 && payment.value.status !== 'CANCELLED',
)
const canCancel = computed(() => !!payment.value && payment.value.paidAmount === 0 && !['CANCELLED', 'REFUNDED'].includes(payment.value.status))
</script>

<template>
  <USlideover v-model:open="open" :title="payment ? t('payments.detailTitle', { n: payment.receiptNumber }) : t('payments.detail')" :ui="{ content: 'max-w-xl' }">
    <template #body>
      <div v-if="loading || !payment" class="space-y-3">
        <USkeleton v-for="i in 8" :key="i" class="h-8" />
      </div>
      <div v-else-if="view === 'receipt'">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" :label="t('common.back')" class="no-print -ml-2 mb-3" @click="view = 'details'" />
        <ReceiptView v-if="receipt" :receipt="receipt" :payment-id="payment.id" />
        <USkeleton v-else class="mx-auto h-96 w-80" />
      </div>
      <div v-else class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm text-muted">{{ t('payments.patient') }}</p>
            <p class="font-semibold text-highlighted">{{ personName(payment.patient, true) }}</p>
            <p class="text-xs text-muted">{{ payment.patient?.patientCode }} · {{ payment.patient?.phone }}</p>
          </div>
          <StatusBadge kind="payment" :value="payment.status" size="lg" />
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-lg bg-elevated/60 p-3">
            <p class="text-xs text-muted">{{ t('common.total') }}</p>
            <MoneyText :value="payment.totalAmount" class="font-semibold" />
          </div>
          <div class="rounded-lg bg-success/10 p-3">
            <p class="text-xs text-muted">{{ t('payments.paid') }}</p>
            <MoneyText :value="payment.paidAmount" class="font-semibold text-success" />
          </div>
          <div class="rounded-lg bg-warning/10 p-3">
            <p class="text-xs text-muted">{{ t('payments.remaining') }}</p>
            <MoneyText :value="payment.remainingAmount" class="font-semibold text-warning" />
          </div>
          <div class="rounded-lg bg-elevated/60 p-3">
            <p class="text-xs text-muted">{{ t('payments.refunded') }}</p>
            <MoneyText :value="payment.refundedAmount" class="font-semibold" />
          </div>
        </div>

        <div class="divide-y divide-default rounded-lg border border-default px-3">
          <InfoRow :label="t('payments.method')" icon="i-lucide-credit-card">{{ labels.paymentMethod(payment.method) }}</InfoRow>
          <InfoRow v-if="payment.contract" :label="t('payments.contractNumber')" icon="i-lucide-file-signature">
            {{ payment.contract.contractNumber }}<span v-if="payment.contract.organization" class="text-muted"> · {{ payment.contract.organization }}</span>
          </InfoRow>
          <InfoRow :label="t('common.createdAt')" :value="formatDateTime(payment.createdAt)" icon="i-lucide-calendar" />
          <InfoRow :label="t('payments.cashier')" :value="personName(payment.createdBy)" icon="i-lucide-user" />
          <InfoRow v-if="payment.note" :label="t('payments.note')" :value="payment.note" icon="i-lucide-sticky-note" />
        </div>

        <div>
          <h4 class="mb-2 text-sm font-semibold text-highlighted">{{ t('payments.services') }}</h4>
          <ul class="divide-y divide-default rounded-lg border border-default">
            <li v-for="item in payment.items" :key="item.id" class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ item.serviceName }}</p>
                <p class="text-xs text-muted">{{ item.serviceCode }}<template v-if="item.doctor"> · {{ doctorName(item.doctor) }}</template></p>
              </div>
              <MoneyText :value="item.amount" />
            </li>
          </ul>
        </div>

        <div v-if="payment.queueTickets?.length">
          <h4 class="mb-2 text-sm font-semibold text-highlighted">{{ t('payments.tickets') }}</h4>
          <div class="flex flex-wrap gap-2">
            <div v-for="tk in payment.queueTickets" :key="tk.id" class="flex items-center gap-2 rounded-lg border border-default px-3 py-2">
              <span class="font-mono text-lg font-bold">{{ tk.ticketNumber }}</span>
              <StatusBadge kind="queue" :value="tk.status" size="sm" />
            </div>
          </div>
        </div>

        <div v-if="payment.transactions?.length">
          <h4 class="mb-2 text-sm font-semibold text-highlighted">{{ t('payments.transactions') }}</h4>
          <ul class="space-y-2">
            <li v-for="tx in payment.transactions" :key="tx.id" class="flex items-center justify-between rounded-lg border border-default px-3 py-2 text-sm">
              <div class="flex items-center gap-2">
                <UIcon :name="tx.type === 'REFUND' ? 'i-lucide-undo-2' : PAYMENT_METHOD_ICON[tx.method]" class="size-4" :class="tx.type === 'REFUND' ? 'text-warning' : 'text-success'" />
                <div>
                  <p class="font-medium">{{ tx.type === 'REFUND' ? t('payments.refund') : labels.paymentMethod(tx.method) }}</p>
                  <p class="text-xs text-muted">{{ formatDateTime(tx.createdAt) }} · {{ personName(tx.createdBy) }}</p>
                  <p v-if="tx.note" class="text-xs text-muted">{{ tx.note }}</p>
                </div>
              </div>
              <MoneyText :value="tx.type === 'REFUND' ? -tx.amount : tx.amount" :class="tx.type === 'REFUND' ? 'text-warning' : 'text-success'" class="font-semibold" />
            </li>
          </ul>
        </div>
      </div>
    </template>
    <template v-if="payment && view === 'details'" #footer>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <UButton v-if="canCancel" color="error" variant="ghost" icon="i-lucide-ban" :loading="busy" :label="t('payments.cancel')" @click="cancel" />
        <UButton v-if="canRefund" color="warning" variant="soft" icon="i-lucide-undo-2" :loading="busy" :label="t('payments.refund')" @click="refund" />
        <UButton v-if="canPay" color="success" icon="i-lucide-plus" :label="t('payments.addPayment')" @click="openPay" />
        <UButton color="neutral" variant="outline" icon="i-lucide-receipt" :label="t('payments.receipt')" @click="showReceipt" />
      </div>
    </template>
  </USlideover>

  <UModal v-model:open="payOpen" :title="t('payments.addPayment')">
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('payments.method')">
          <URadioGroup v-model="pay.method" :items="methodItems" orientation="horizontal" variant="card" indicator="hidden" />
        </UFormField>
        <UFormField :label="t('payments.amount')" :hint="payment ? t('payments.maxAmount', { amount: useMoney().format(payment.remainingAmount) }) : undefined">
          <UInputNumber v-model="pay.amount" :min="1" :max="payment?.remainingAmount" :step="1000" class="w-full" :format-options="{ useGrouping: true, maximumFractionDigits: 0 }" />
        </UFormField>
        <UFormField :label="t('payments.note')">
          <UInput v-model="pay.note" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="payOpen = false" />
        <UButton :loading="busy" :disabled="pay.amount <= 0" icon="i-lucide-check" :label="t('common.save')" @click="submitPay" />
      </div>
    </template>
  </UModal>
</template>
