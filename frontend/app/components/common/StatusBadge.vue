<script setup lang="ts">
import type { KioskRequestStatus, PaymentStatus, QueueStatus, Role, UserStatus } from '~/types/api'
import {
  KIOSK_STATUS_COLOR,
  PAYMENT_STATUS_COLOR,
  QUEUE_STATUS_COLOR,
  ROLE_COLOR,
  USER_STATUS_COLOR,
} from '~/composables/useLabels'

type Props =
  | { kind: 'queue'; value: QueueStatus; size?: 'sm' | 'md' | 'lg' }
  | { kind: 'payment'; value: PaymentStatus; size?: 'sm' | 'md' | 'lg' }
  | { kind: 'user'; value: UserStatus; size?: 'sm' | 'md' | 'lg' }
  | { kind: 'kiosk'; value: KioskRequestStatus; size?: 'sm' | 'md' | 'lg' }
  | { kind: 'role'; value: Role; size?: 'sm' | 'md' | 'lg' }

const props = defineProps<Props>()
const labels = useLabels()

const view = computed(() => {
  switch (props.kind) {
    case 'queue':
      return { color: QUEUE_STATUS_COLOR[props.value], label: labels.queueStatus(props.value) }
    case 'payment':
      return { color: PAYMENT_STATUS_COLOR[props.value], label: labels.paymentStatus(props.value) }
    case 'user':
      return { color: USER_STATUS_COLOR[props.value], label: labels.userStatus(props.value) }
    case 'kiosk':
      return { color: KIOSK_STATUS_COLOR[props.value], label: labels.kioskStatus(props.value) }
    case 'role':
      return { color: ROLE_COLOR[props.value], label: labels.role(props.value) }
    default:
      return { color: 'neutral' as const, label: '' }
  }
})
</script>

<template>
  <UBadge :color="view.color" variant="subtle" :size="props.size ?? 'md'" class="whitespace-nowrap">
    {{ view.label }}
  </UBadge>
</template>
