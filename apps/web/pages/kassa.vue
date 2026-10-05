<template>
<div>
  <div class="row" style="justify-content:space-between"><div><h1>Kassa</h1><p class="muted">Xizmat tanlang va to‘lov yarating</p></div><span class="pill">{{ cart.length }} ta xizmat</span></div>
  <div class="grid g2">
    <section class="card">
      <h3>Mijoz</h3>
      <input v-model="search" class="input" placeholder="Ism, familiya yoki telefon" @input="findPatients">
      <div v-for="p in patients" :key="p.id" class="card" style="margin-top:8px;padding:10px;cursor:pointer" @click="selectPatient(p)">
        <b>{{p.lastName}} {{p.firstName}}</b><div class="muted">{{p.phone}}</div>
      </div>
      <div v-if="selected" class="pill" style="margin-top:10px">Tanlandi: {{selected.lastName}} {{selected.firstName}}</div>
      <hr style="border-color:#374151;margin:18px 0">
      <input v-model="serviceSearch" class="input" placeholder="Xizmat qidirish">
      <div v-for="d in departments" :key="d.key" style="margin-top:14px">
        <h3>{{d.icon}} {{d.name}}</h3>
        <div class="grid g2">
          <div v-for="s in services.filter(x=>x.deptKey===d.key && (!serviceSearch || (x.name+x.code).toLowerCase().includes(serviceSearch.toLowerCase())))" :key="s.code" class="card service" @click="add(s)">
            <b>{{s.name}}</b><div class="muted">{{s.code}}</div><strong>{{money(s.price)}} so‘m</strong>
          </div>
        </div>
      </div>
    </section>
    <section class="card">
      <h3>Savat</h3>
      <div v-if="!cart.length" class="muted">Hozircha xizmat tanlanmagan.</div>
      <div v-for="(x,i) in cart" :key="i" class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid #374151">
        <div><b>{{x.name}}</b><div class="muted">{{x.code}}</div></div><div>{{money(x.price*x.qty)}} <button class="btn danger" style="padding:4px 8px" @click="cart.splice(i,1)">×</button></div>
      </div>
      <h2 style="text-align:right">Jami: {{money(total)}} so‘m</h2>
      <div class="grid">
        <button class="btn primary" :disabled="busy" @click="checkout('card')">💳 Plastik / karta</button>
        <button class="btn" style="background:#f59e0b" :disabled="busy" @click="checkout('pending')">⏳ To‘lov jarayonda</button>
        <button class="btn" style="background:#22c55e" :disabled="busy" @click="checkout('contract')">📄 Shartnoma</button>
      </div>
      <p v-if="message" class="pill" style="margin-top:12px">{{message}}</p><button v-if="lastOrder" class="btn" style="margin-top:10px" @click="printReceipt">🖨 Chekni chop etish</button>
    </section>
  </div>
</div>
</template>
<script setup lang="ts">
definePageMeta({ layout:'default' })
const {request}=useApi(); const services=ref<any[]>([]); const departments=ref<any[]>([]); const patients=ref<any[]>([]); const selected=ref<any>(null)
const cart=ref<any[]>([]); const lastOrder=ref<any>(null); const search=ref(''); const serviceSearch=ref(''); const busy=ref(false); const message=ref('')
const money=(n:number)=>new Intl.NumberFormat('uz-UZ').format(n)
const load=async()=>{services.value=await request('/services');departments.value=await request('/departments')}
onMounted(load)
const findPatients=async()=>{patients.value=search.value.length>1?await request('/patients/lookup?q='+encodeURIComponent(search.value)):[]}
const selectPatient=(p:any)=>{selected.value=p;patients.value=[]}
const add=(s:any)=>{const x=cart.value.find(x=>x.code===s.code);if(x)x.qty++;else cart.value.push({...s,qty:1})}
const total=computed(()=>cart.value.reduce((a,x)=>a+x.price*x.qty,0))
const printReceipt=()=>{if(!lastOrder.value)return;const o=lastOrder.value;const html=`<html><head><title>Chek #${o.displayId}</title><style>body{font-family:Arial;width:280px;margin:20px}h2{text-align:center}.line{display:flex;justify-content:space-between;border-bottom:1px dashed #999;padding:6px 0}</style></head><body><h2>CLINIKA / LABMED</h2><p>Chek № ${o.displayId}</p><p>${new Date().toLocaleString('uz-UZ')}</p>${o.items.map((i:any)=>`<div class='line'><span>${i.name} × ${i.qty}</span><b>${money(i.price*i.qty)}</b></div>`).join('')}<h3>Jami: ${money(o.total)} so‘m</h3><p>To‘lov: ${typeName(o.paymentType)}</p></body></html>`;const w=window.open('','_blank','width=400,height=600');if(w){w.document.write(html);w.document.close();w.print()}};const typeName=(x:string)=>({card:'Plastik / karta',pending:'To‘lov jarayonda',contract:'Shartnoma'} as any)[x]||x;
const checkout=async(type:string)=>{if(!cart.value.length)return;busy.value=true;message.value='';try{lastOrder.value=await request('/orders',{method:'POST',body:{type,patientId:selected.value?.id,firstName:selected.value?.firstName||'Noma’lum',lastName:selected.value?.lastName||'Mijoz',items:cart.value.map(x=>({code:x.code,qty:x.qty}))}});message.value='Buyurtma muvaffaqiyatli saqlandi';cart.value=[]}catch(e:any){message.value='Xatolik: buyurtma saqlanmadi'}finally{busy.value=false}}
</script>
