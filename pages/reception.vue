<script setup lang="ts">
const { data: patients } = await useFetch('/api/patients', { query: { page: 1 } })
const { data: doctors } = await useFetch('/api/doctors')
const { data: services } = await useFetch('/api/services')
const appointments = ref<any[]>([])
const form = reactive({ patientId: '', doctorId: '', serviceId: '' })
async function load() {
  const result: any = await $fetch('/api/appointments')
  appointments.value = result.appointments
}
async function add() {
  if (!form.patientId) return
  await $fetch('/api/appointments', { method: 'POST', body: form })
  Object.assign(form, { patientId: '', doctorId: '', serviceId: '' })
  await load()
}
async function setStatus(id: number, status: string) {
  await $fetch(`/api/appointments/${id}`, { method: 'PATCH', body: { status } })
  await load()
}
onMounted(load)
</script>
<template>
  <div class="card">
    <h1>📋 Qabul va navbat</h1>
    <div class="filters">
      <select v-model="form.patientId"><option value="">Bemor tanlang</option><option v-for="p in (patients as any)?.patients || []" :key="p.id" :value="p.id">{{ p.fullName }}</option></select>
      <select v-model="form.doctorId"><option value="">Shifokor tanlang</option><option v-for="d in (doctors as any)?.doctors || []" :key="d.id" :value="d.id">{{ d.fullName }}</option></select>
      <select v-model="form.serviceId"><option value="">Xizmat tanlang</option><option v-for="s in (services as any)?.services || []" :key="s.id" :value="s.id">{{ s.name }}</option></select>
      <button class="btn" @click="add">Navbatga qo‘shish</button>
    </div>
    <table class="table"><thead><tr><th>Bemor</th><th>Shifokor</th><th>Xizmat</th><th>Holat</th><th>Amal</th></tr></thead>
      <tbody><tr v-for="a in appointments" :key="a.id"><td>{{ a.patient.fullName }}</td><td>{{ a.doctor?.fullName || '—' }}</td><td>{{ a.service?.name || '—' }}</td><td>{{ a.status }}</td><td><button v-if="a.status === 'WAITING'" class="btn small" @click="setStatus(a.id, 'IN_PROGRESS')">Qabulda</button><button v-if="a.status === 'IN_PROGRESS'" class="btn small" @click="setStatus(a.id, 'COMPLETED')">Yakunlash</button></td></tr></tbody>
    </table>
  </div>
</template>
