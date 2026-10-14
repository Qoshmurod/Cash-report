<script setup lang="ts">
definePageMeta({ alias: '/admin/department/:department()' })
const route = useRoute()
const { depLabel } = useMeta()
const department = computed(() => String(route.params.department || '').toUpperCase())
const date = ref(todayString())
const payments = ref<any[]>([])
const error = ref('')

async function load() {
  try {
    const data: any = await $fetch('/api/payments', { query: { department: department.value, from: date.value, to: date.value } })
    payments.value = data.payments
    error.value = ''
  } catch (e: any) {
    error.value = apiError(e)
  }
}
// Only analyses belonging to this department are shown for each patient.
// Amount belonging to this department: its own service lines, or the whole payment for older/unpriced records.
const amountFor = (payment: any) => {
  const own = (payment.paymentServices || []).filter((item: any) => item.service.department === department.value).reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
  return own || payment.amount
}
const total = computed(() => payments.value.reduce((sum: number, payment: any) => sum + amountFor(payment), 0))
const services = (payment: any) => payment.paymentServices?.filter((item: any) => item.service.department === department.value).map((item: any) => item.service.name).join(', ') || payment.service || '—'
watch(date, load)
usePolling(load, 15000)
onMounted(load)
</script>

<template>
  <div class="card">
    <div class="page-header">
      <h1>🧪 {{ depLabel(department) }} bo‘limi</h1>
      <input v-model="date" type="date" />
    </div>
    <p class="muted">Kassa/registratura shu bo‘limga yo‘naltirgan bemorlar va analizlar.</p>
    <p v-if="error" class="error">{{ error }}</p>
    <table class="table">
      <thead><tr><th>Vaqt</th><th>Bemor</th><th>Telefon</th><th>Analiz/xizmat</th><th>Summa</th><th>Asos</th></tr></thead>
      <tbody>
        <tr v-for="payment in payments" :key="payment.id">
          <td>{{ formatDate(payment.createdAt) }}</td>
          <td><strong>{{ payment.patient.fullName }}</strong></td>
          <td>{{ payment.patient.phone || '—' }}</td>
          <td>{{ services(payment) }}</td>
          <td><strong>{{ formatSum(amountFor(payment)) }}</strong><div v-if="amountFor(payment) !== payment.amount" class="muted">to‘lov jami: {{ formatSum(payment.amount) }}</div></td>
          <td><span v-if="payment.contract" class="badge blue">Shartnoma №{{ payment.contract.number }}</span><span v-else class="badge green">To‘langan</span></td>
        </tr>
        <tr v-if="payments.length" class="total-row"><td colspan="4">Jami: {{ payments.length }} ta bemor</td><td colspan="2"><strong>{{ formatSum(total) }}</strong></td></tr>
        <tr v-if="!payments.length"><td colspan="6" class="empty">Bu bo‘lim uchun bemorlar topilmadi</td></tr>
      </tbody>
    </table>
  </div>
</template>
