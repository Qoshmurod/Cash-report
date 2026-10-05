<template><div><h1>Xizmat ko‘rsatish</h1><div class="grid g2">
<div v-for="o in orders" :key="o.id" class="card"><h3>#{{o.displayId}} — {{o.patientFullName}}</h3><div v-for="i in o.items" :key="i.id" class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid #374151"><span>{{i.name}} <span class="pill">{{i.deptKey}}</span></span><button v-if="i.serviceStatus!=='completed'" class="btn primary" @click="complete(i.id)">Bajarildi</button><span v-else class="pill">✓ Bajarilgan</span></div></div>
</div></div></template>
<script setup lang="ts">
const {request}=useApi();const orders=ref<any[]>([]);const load=async()=>orders.value=await request('/provision/orders');onMounted(load);const complete=async(id:string)=>{await request('/provision/items/'+id+'/complete',{method:'PATCH'});await load()}
</script>
