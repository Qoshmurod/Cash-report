<script setup lang="ts">
import type { ContractView } from '~/types/api'

/** Balance meter: how much of the transferred money is left, with the warning threshold marked. */
const props = defineProps<{
  contract: Pick<ContractView, 'deposited' | 'spent' | 'balance' | 'balancePercent' | 'lowBalance' | 'warningThresholdPercent'> &
    Partial<Pick<ContractView, 'credit' | 'debt' | 'available' | 'contractAmount' | 'unpaid'>>
  pending?: number
}>()
const intoCredit = computed(() => !!props.pending && props.pending > Math.max(0, props.contract.balance))
const { t } = useI18n()
const { format } = useMoney()

const pct = (v: number) => (props.contract.deposited > 0 ? Math.max(0, Math.min(100, (v / props.contract.deposited) * 100)) : 0)
const left = computed(() => pct(props.contract.balance))
const after = computed(() => (props.pending ? pct(props.contract.balance - props.pending) : left.value))
const afterLow = computed(() => props.contract.deposited <= 0 || after.value <= props.contract.warningThresholdPercent)
const tone = computed(() => (props.contract.balance <= 0 ? 'bg-error' : props.contract.lowBalance ? 'bg-warning' : 'bg-success'))
</script>

<template>
  <div class="space-y-2 rounded-lg border border-default p-3">
    <div class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
      <span class="text-muted">{{ t('contracts.balance') }}</span>
      <span class="font-semibold tabular" :class="props.contract.lowBalance ? 'text-warning' : 'text-highlighted'">
        {{ format(props.contract.balance) }}
        <span class="text-xs font-normal text-muted">({{ props.contract.balancePercent }}%)</span>
      </span>
    </div>
    <div class="relative h-2.5 overflow-hidden rounded-full bg-elevated" role="meter" :aria-valuenow="left" aria-valuemin="0" aria-valuemax="100">
      <div class="absolute inset-y-0 left-0 rounded-full opacity-35" :class="tone" :style="{ width: `${left}%` }" />
      <div class="absolute inset-y-0 left-0 rounded-full" :class="tone" :style="{ width: `${after}%` }" />
      <div class="absolute inset-y-0 w-0.5 bg-error" :style="{ left: `${props.contract.warningThresholdPercent}%` }" :title="t('contracts.threshold')" />
    </div>
    <div class="flex flex-wrap justify-between gap-2 text-xs text-muted tabular">
      <span>{{ t('contracts.deposited') }}: {{ format(props.contract.deposited) }}</span>
      <span>{{ t('contracts.spent') }}: {{ format(props.contract.spent) }}</span>
    </div>
    <div v-if="(props.contract.credit ?? 0) > 0 || (props.contract.debt ?? 0) > 0" class="flex flex-wrap justify-between gap-2 text-xs tabular">
      <span class="text-success">{{ t('guarantees.creditLimit') }}: {{ format(props.contract.credit ?? 0) }}</span>
      <span :class="(props.contract.debt ?? 0) > 0 ? 'text-error' : 'text-muted'">{{ t('guarantees.debt') }}: {{ format(props.contract.debt ?? 0) }}</span>
    </div>
    <p v-if="intoCredit" class="text-xs font-medium text-warning">{{ t('guarantees.intoCredit', { amount: format(Math.min(props.pending!, props.pending! - Math.max(0, props.contract.balance))) }) }}</p>
    <p v-if="props.pending" class="text-xs" :class="afterLow ? 'text-warning' : 'text-muted'">
      {{ t('contracts.afterCheckout', { amount: format(Math.max(0, (props.contract.available ?? props.contract.balance) - props.pending)) }) }}
      <template v-if="afterLow"> · {{ t('contracts.lowBalance') }}</template>
    </p>
    <UAlert
      v-else-if="props.contract.lowBalance"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('contracts.lowBalanceAlert', { p: props.contract.warningThresholdPercent })"
    />
  </div>
</template>
