<template>
<div>
  <div class="row" style="justify-content:space-between"><div><h1>Bosh sahifa</h1><p class="muted">Clinika / LabMed boshqaruv paneli</p></div><button class="btn" @click="load">↻ Yangilash</button></div>
  <div class="grid g4">
    <div class="card stat"><div class="muted">Bugungi buyurtmalar</div><h2>{{today.orders}}</h2></div>
    <div class="card stat"><div class="muted">Bugungi tushum</div><h2>{{money(today.revenue)}} so‘m</h2></div>
    <div class="card stat"><div class="muted">Jami mijozlar</div><h2>{{today.patients}}</h2></div>
    <div class="card stat"><div class="muted">To‘lov jarayonda</div><h2>{{pending.length}}</h2></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <section class="card"><h3>To‘lovlar</h3><div v-for="p in today.byPayment" :key="p.paymentType" class="row" style="justify-content:space-between;padding:12px 0;border-bottom:1px solid #374151"><span>{{payName(p.paymentType)}} <span class="muted">({{p.count}} ta)</span></span><b>{{money(p.total)}} so‘m</b></div></section>
    <section class="card"><h3>To‘lov jarayonda</h3><div v-if="!pending.length" class="muted">Jarayonda to‘lov yo‘q.</div><div v-for="o in pending.slice(0,6)" :key="o.id" class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid #374151"><span>#{{o.displayId}} — {{o.patientFullName}}</span><b>{{money(o.total)}} so‘m</b></div></section>
  </div>
  <div class="card" style="margin-top:16px"><h3>Tezkor amallar</h3><div class="row wrap"><NuxtLink class="btn primary" to="/kassa">+ Kassa</NuxtLink><NuxtLink class="btn" to="/provision">🧪 Xizmat ko‘rsatish</NuxtLink><NuxtLink class="btn" to="/reports">📊 Hisobot</NuxtLink><NuxtLink v-if="auth.can('user_access')" class="btn" to="/admin">⚙ Boshqaruv</NuxtLink></div></div>
</div>
</template>
<script setup lang="ts">
import { useAuthStore } from '#imports'
const auth=useAuthStore();const {request}=useApi();const today=ref<any>({orders:0,revenue:0,patients:0,byPayment:[]});const pending=ref<any[]>([]);const money=(n:number)=>new Intl.NumberFormat('uz-UZ').format(n);const payName=(x:string)=>({card:'Plastik / karta',contract:'Shartnoma',pending:'Jarayonda'} as any)[x]||x;const load=async()=>{const d=new Date();const x=d.toISOString().slice(0,10);today.value=auth.can('report_view')?await request('/reports/summary?from='+x+'&to='+x):{orders:0,revenue:0,patients:0,byPayment:[]};pending.value=auth.can('cashier_access')?await request('/orders/pending'):[]};onMounted(load)
</script>
