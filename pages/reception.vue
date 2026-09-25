<script setup lang="ts">
const { data: patients } = await useFetch('/api/patients', { query: { page: 1 }, server: false })
const { data: departments } = await useFetch('/api/departments', { server: false })
const patientList = computed(() => (patients.value as any)?.patients || [])
const departmentList = computed(() => (departments.value as any)?.departments || [])
const serviceList = ref<any[]>([])
const form = reactive({ patientId: '', department: '', serviceId: '', method: 'CASH' })
const error = ref('')
const saved = ref(false)

watch(() => form.department, async (department) => {
  form.serviceId = ''
  serviceList.value = department ? ((await $fetch<any>('/api/services', { query: { department } })).services || []) : []
})
const selectedService = computed(() => serviceList.value.find((service) => String(service.id) === form.serviceId))

async function savePayment() {
  error.value = ''
  saved.value = false
  try {
    if (!form.patientId || !form.department || !form.serviceId || !selectedService.value) throw new Error('Bemor, bo‘lim va xizmatni tanlang')
    await $fetch('/api/payments', {
      method: 'POST',
      body: { patientId: Number(form.patientId), department: form.department, serviceIds: [Number(form.serviceId)], service: selectedService.value.name, amount: selectedService.value.price, method: form.method }
    })
    saved.value = true
    Object.assign(form, { patientId: '', department: '', serviceId: '', method: 'CASH' })
    serviceList.value = []
  } catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Saqlash amalga oshmadi'
  }
}
</script>

<template>
  <div class="card">
    <h1>📋 Qabul</h1>
    <p>Bemorni, bo‘limni va shu bo‘limga tegishli xizmatni tanlang.</p>
    <div class="filters">
      <select v-model="form.patientId"><option value="">Bemor tanlang</option><option v-for="p in patientList" :key="p.id" :value="p.id">{{ p.fullName }}</option></select>
      <select v-model="form.department"><option value="">Bo‘lim tanlang</option><option v-for="d in departmentList" :key="d.id" :value="d.code">{{ d.name }}</option></select>
      <select v-model="form.serviceId" :disabled="!form.department"><option value="">Xizmat tanlang</option><option v-for="s in serviceList" :key="s.id" :value="s.id">{{ s.name }} — {{ s.price.toLocaleString() }} so‘m</option></select>
      <select v-model="form.method"><option value="CASH">Naqd</option><option value="CARD">Plastik</option><option value="TRANSFER">O‘tkazma</option></select>
      <button class="btn" @click="savePayment">To‘lovni saqlash</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="saved" class="success">To‘lov saqlandi.</p>
  </div>
</template>
