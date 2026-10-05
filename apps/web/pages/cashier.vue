<template>
<div><h1>To‘lovlar</h1><p class="muted">Jarayondagi to‘lovlarni tanlang va kunni yoping.</p>
<div class="card"><div class="row" style="justify-content:space-between"><button class="btn primary" @click="selectAll">Barchasini tanlash</button><button class="btn" style="background:#22c55e" @click="close">Kunni yopish ({{selected.length}})</button></div>
<table class="table"><thead><tr><th></th><th>#</th><th>Mijoz</th><th>Summa</th><th>Vaqt</th></tr></thead><tbody>
<tr v-for="o in orders" :key="o.id"><td><input type="checkbox" v-model="selected" :value="o.id"></td><td>{{o.displayId}}</td><td>{{o.patientFullName}}</td><td>{{money(o.total)}} so‘m</td><td>{{new Date(o.createdAt).toLocaleString('uz-UZ')}}</td></tr>
</tbody></table><p v-if="message" class="pill">{{message}}</p></div></div>
</template>
<script setup lang="ts">
const {request}=useApi();const orders=ref<any[]>([]);const selected=ref<string[]>([]);const message=ref('');const money=(n:number)=>new Intl.NumberFormat('uz-UZ').format(n)
const load=async()=>orders.value=await request('/orders/pending');onMounted(load)
const selectAll=()=>selected.value=orders.value.map(x=>x.id)
const close=async()=>{if(!selected.value.length)return;const r:any=await request('/orders/close-day',{method:'POST',body:{orderIds:selected.value}});message.value=`${r.updated} ta to‘lov yopildi`;await load();selected.value=[]}
</script>
