<script setup lang="ts">
const route = useRoute()
const department = computed(() => String(route.params.department || '').toUpperCase())
const { data, refresh } = await useFetch('/api/payments', {
  query: computed(() => ({ department: department.value })),
  server: false
})
const { data: departmentsData } = await useFetch('/api/departments', { server: false })
const payments = computed(() => (data.value as any)?.payments || [])
const label = computed(() => {
  const item = (departmentsData.value as any)?.departments?.find((entry: any) => entry.code === department.value)
  return item?.name || department.value
})
const services = (payment: any) => payment.paymentServices?.map((item: any) => item.service.name).join(', ') || payment.service || '—'
function formatDate(value: string) {
  return new Date(value).toLocaleString('uz-UZ')
}
function formatSum(value: number) {
  return new Intl.NumberFormat('uz-UZ').format(value) + ' so‘m'
}
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => refresh(), 10000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="card">
    <h1>🧪 {{ label }} bo‘limi</h1>
    <p class="muted">Kassir hozir to‘lov bilan birga belgilagan bemorlar va analizlar.</p>
    <table class="table">
      <thead><tr><th>Vaqt</th><th>Bemor</th><th>Telefon</th><th>Analiz/xizmat</th><th>Summa</th></tr></thead>
      <tbody>
        <tr v-for="payment in payments" :key="payment.id">
          <td>{{ formatDate(payment.createdAt) }}</td>
          <td><strong>{{ payment.patient.fullName }}</strong></td>
          <td>{{ payment.patient.phone || '—' }}</td>
          <td>{{ services(payment) }}</td>
          <td>{{ formatSum(payment.amount) }}</td>
        </tr>
        <tr v-if="!payments.length"><td colspan="5" class="empty">Bu bo‘lim uchun to‘lovlar topilmadi</td></tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.muted { color: #6b7280; margin-bottom: 18px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
.table th { background: #f9fafb; }
.empty { color: #9ca3af; text-align: center; padding: 28px; }
</style>
