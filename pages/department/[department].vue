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
const services = (payment: any) => payment.paymentServices?.filter((item: any) => item.service.department === department.value).map((item: any) => item.service.name).join(', ') || payment.service || '—'
let timer: ReturnType<typeof setInterval> | undefined
watch(date, load)
onMounted(() => { load(); timer = setInterval(load, 10000) })
onUnmounted(() => clearInterval(timer))
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
      <thead><tr><th>Vaqt</th><th>Bemor</th><th>Telefon</th><th>Analiz/xizmat</th><th>Asos</th></tr></thead>
      <tbody>
        <tr v-for="payment in payments" :key="payment.id">
          <td>{{ formatDate(payment.createdAt) }}</td>
          <td><strong>{{ payment.patient.fullName }}</strong></td>
          <td>{{ payment.patient.phone || '—' }}</td>
          <td>{{ services(payment) }}</td>
          <td><span v-if="payment.contract" class="badge blue">Shartnoma №{{ payment.contract.number }}</span><span v-else class="badge green">To‘langan</span></td>
        </tr>
        <tr v-if="!payments.length"><td colspan="5" class="empty">Bu bo‘lim uchun bemorlar topilmadi</td></tr>
      </tbody>
    </table>
  </div>
</template>
