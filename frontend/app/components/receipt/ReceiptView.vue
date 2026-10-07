<script setup lang="ts">
import type { Receipt } from '~/types/api'

const props = defineProps<{ receipt: Receipt; paymentId?: string; hideActions?: boolean }>()
const { t } = useI18n()
const labels = useLabels()
const { formatAmount } = useMoney()
const { formatDateTime } = useDate()
const settings = useSettingsStore()
const { downloading, download } = useApiDownload()

function print() {
  window.print()
}

function pdf() {
  if (!props.paymentId) return
  void download(`/payments/${props.paymentId}/receipt/pdf`, undefined, `receipt-${props.receipt.receiptNumber}.pdf`)
}
</script>

<template>
  <div>
    <!-- 80mm thermal receipt: monospace, black on white in both themes -->
    <div class="print-area mx-auto w-full max-w-[320px] rounded-lg border border-dashed border-accented bg-white p-5 font-mono text-[12px] leading-relaxed text-black shadow-sm">
      <div class="text-center">
        <p class="text-[15px] font-bold uppercase">{{ props.receipt.hospitalName }}</p>
        <p v-if="props.receipt.hospitalAddress">{{ props.receipt.hospitalAddress }}</p>
        <p v-if="props.receipt.hospitalPhone">{{ props.receipt.hospitalPhone }}</p>
        <p v-if="props.receipt.header" class="mt-1 whitespace-pre-line">{{ props.receipt.header }}</p>
      </div>
      <div class="my-2 border-t border-dashed border-black" />
      <div class="flex justify-between"><span>{{ t('receipt.number') }}</span><span>{{ props.receipt.receiptNumber }}</span></div>
      <div class="flex justify-between"><span>{{ t('receipt.date') }}</span><span>{{ formatDateTime(props.receipt.date) }}</span></div>
      <div class="mt-1">
        <p>{{ t('receipt.patient') }}:</p>
        <p class="font-bold">{{ props.receipt.patientName }}</p>
        <p>{{ props.receipt.patientCode }}</p>
      </div>
      <div class="my-2 border-t border-dashed border-black" />
      <p class="mb-1">{{ t('receipt.services') }}:</p>
      <div v-for="(item, i) in props.receipt.items" :key="i" class="flex justify-between gap-2">
        <span class="min-w-0 break-words">{{ item.name }}<template v-if="item.quantity > 1"> ×{{ item.quantity }}</template></span>
        <span class="shrink-0">{{ formatAmount(item.amount) }}</span>
      </div>
      <div class="my-2 border-t border-dashed border-black" />
      <div class="flex justify-between text-[14px] font-bold"><span>{{ t('receipt.total') }}</span><span>{{ formatAmount(props.receipt.totalAmount) }} {{ settings.currency }}</span></div>
      <div class="flex justify-between"><span>{{ t('receipt.paid') }}</span><span>{{ formatAmount(props.receipt.paidAmount) }}</span></div>
      <div v-if="props.receipt.remainingAmount > 0" class="flex justify-between font-bold">
        <span>{{ t('receipt.remaining') }}</span><span>{{ formatAmount(props.receipt.remainingAmount) }}</span>
      </div>
      <div class="flex justify-between"><span>{{ t('receipt.method') }}</span><span class="uppercase">{{ labels.paymentMethod(props.receipt.method) }}</span></div>
      <div v-if="props.receipt.contractNumber" class="flex justify-between"><span>{{ t('receipt.contract') }}</span><span>{{ props.receipt.contractNumber }}</span></div>
      <div class="flex justify-between"><span>{{ t('receipt.cashier') }}</span><span>{{ props.receipt.cashier }}</span></div>

      <template v-for="ticket in props.receipt.tickets" :key="ticket.ticketNumber">
        <div class="my-3 border-t-2 border-dashed border-black" />
        <div class="text-center">
          <p class="text-[11px] uppercase tracking-widest">{{ t('receipt.queueNumber') }}</p>
          <p class="text-[40px] font-black leading-none tracking-tight">{{ ticket.ticketNumber }}</p>
          <p v-if="ticket.roomNumber" class="mt-1 text-[16px] font-bold uppercase">{{ t('receipt.room', { room: ticket.roomNumber }) }}</p>
          <p class="mt-1">{{ ticket.doctorName }}</p>
          <p class="text-[11px]">{{ ticket.departmentName }} · {{ ticket.services.join(', ') }}</p>
        </div>
      </template>

      <div class="my-3 border-t border-dashed border-black" />
      <p class="text-center whitespace-pre-line">{{ props.receipt.footer || t('receipt.thanks') }}</p>
    </div>

    <div v-if="!props.hideActions" class="no-print mt-4 flex justify-center gap-2">
      <UButton icon="i-lucide-printer" :label="t('receipt.print')" @click="print" />
      <UButton v-if="props.paymentId" color="neutral" variant="outline" icon="i-lucide-file-down" :loading="downloading" :label="t('receipt.pdf')" @click="pdf" />
    </div>
  </div>
</template>
