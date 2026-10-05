<template>
  <div>
    <div class="row" style="justify-content:space-between"><div><h1>Boshqaruv</h1><p class="muted">Xodimlar, xizmatlar, bo‘limlar va shartnomalarni boshqarish.</p></div></div>
    <div class="tabs">
      <button class="btn" :class="{active:tab==='users'}" @click="tab='users'">Xodimlar</button>
      <button class="btn" :class="{active:tab==='services'}" @click="tab='services'">Xizmatlar</button>
      <button class="btn" :class="{active:tab==='departments'}" @click="tab='departments'">Bo‘limlar</button>
      <button class="btn" :class="{active:tab==='contracts'}" @click="tab='contracts'">Shartnomalar</button>
      <button class="btn" :class="{active:tab==='audit'}" @click="tab='audit'">Audit</button>
    </div>

    <section v-if="tab==='users'" class="card">
      <div class="row" style="justify-content:space-between"><h3>Xodimlar</h3><button class="btn primary" @click="showUser=true">+ Xodim</button></div>
      <table class="table"><thead><tr><th>Ism</th><th>Login</th><th>Rol</th><th>Bo‘lim</th><th>Holat</th><th></th></tr></thead><tbody><tr v-for="u in users" :key="u.id"><td>{{u.name}}</td><td>{{u.login}}</td><td>{{u.role?.name}}</td><td>{{u.departments?.map((x:any)=>x.deptKey).join(', ') || '—'}}</td><td><span class="pill">{{u.isActive?'Faol':'Nofaol'}}</span></td><td><button class="btn" @click="editUser(u)">Tahrirlash</button></td></tr></tbody></table>
    </section>

    <section v-if="tab==='services'" class="card">
      <div class="row" style="justify-content:space-between"><h3>Xizmatlar</h3><button class="btn primary" @click="showService=true">+ Xizmat</button></div>
      <div class="row"><input v-model="serviceSearch" class="input" placeholder="Xizmat yoki kod qidirish"><label class="btn"><input type="file" accept=".xlsx,.xls,.csv" hidden @change="importExcel"> Excel import</label><a class="btn" :href="exportUrl" download>Excel namuna</a></div>
      <table class="table"><thead><tr><th>Kod</th><th>Nomi</th><th>Bo‘lim</th><th>Narx</th><th>Holat</th><th></th></tr></thead><tbody><tr v-for="s in filteredServices" :key="s.id"><td>{{s.code}}</td><td>{{s.name}}</td><td>{{s.deptKey}}</td><td>{{money(s.price)}} so‘m</td><td>{{s.isActive?'Faol':'Nofaol'}}</td><td><button class="btn" @click="editService(s)">Tahrirlash</button></td></tr></tbody></table>
    </section>

    <section v-if="tab==='departments'" class="card"><div class="row" style="justify-content:space-between"><h3>Bo‘limlar</h3><button class="btn primary" @click="showDept=true">+ Bo‘lim</button></div><table class="table"><thead><tr><th>Icon</th><th>Kalit</th><th>Nomi</th><th></th></tr></thead><tbody><tr v-for="d in departments" :key="d.key"><td>{{d.icon}}</td><td>{{d.key}}</td><td>{{d.name}}</td><td><button class="btn" @click="editDept(d)">Tahrirlash</button></td></tr></tbody></table></section>

    <section v-if="tab==='contracts'" class="card"><div class="row" style="justify-content:space-between"><h3>Shartnomalar</h3><button class="btn primary" @click="showContract=true">+ Shartnoma</button></div><table class="table"><thead><tr><th>№</th><th>Jami</th><th>To‘langan</th><th>Qoldiq</th><th>Ogohlantirish</th></tr></thead><tbody><tr v-for="c in contracts" :key="c.id"><td>{{c.contractNo}}</td><td>{{money(c.total)}} so‘m</td><td>{{money(c.paid)}} so‘m</td><td>{{money(c.remaining)}} so‘m</td><td><span v-if="c.alert10" class="pill warn">⚠ 10% qoldi</span><span v-else>—</span></td></tr></tbody></table></section>

    <section v-if="tab==='audit'" class="card"><h3>Audit jurnali</h3><table class="table"><thead><tr><th>Sana</th><th>Login</th><th>Amal</th><th>Obyekt</th></tr></thead><tbody><tr v-for="a in audit" :key="a.id"><td>{{fmt(a.createdAt)}}</td><td>{{a.login}}</td><td>{{a.action}}</td><td>{{a.entity}} {{a.entityId||''}}</td></tr></tbody></table></section>

    <div v-if="showUser" class="modal"><div class="modal-box"><h2>{{editingUser?'Xodimni tahrirlash':'Yangi xodim'}}</h2><input v-model="userForm.name" class="input" placeholder="F.I.Sh."><input v-model="userForm.login" class="input" placeholder="Login" :disabled="!!editingUser"><input v-model="userForm.password" class="input" placeholder="Parol (yangi xodim uchun)"><select v-model="userForm.roleId" class="input"><option v-for="r in roles" :value="r.id">{{r.name}}</option></select><input v-model="userForm.departmentsText" class="input" placeholder="Bo‘limlar: bakteriologiya,virusologiya"><div class="row"><button class="btn primary" @click="saveUser">Saqlash</button><button class="btn" @click="showUser=false">Bekor</button></div></div></div>
    <div v-if="showService" class="modal"><div class="modal-box"><h2>{{editingService?'Xizmatni tahrirlash':'Yangi xizmat'}}</h2><input v-model="serviceForm.code" class="input" placeholder="Kod"><input v-model="serviceForm.name" class="input" placeholder="Xizmat nomi"><select v-model="serviceForm.deptKey" class="input"><option v-for="d in departments" :value="d.key">{{d.name}}</option></select><input v-model.number="serviceForm.price" type="number" class="input" placeholder="Narx"><div class="row"><button class="btn primary" @click="saveService">Saqlash</button><button class="btn" @click="showService=false">Bekor</button></div></div></div>
    <div v-if="showDept" class="modal"><div class="modal-box"><h2>Bo‘lim</h2><input v-model="deptForm.key" class="input" placeholder="key (masalan: gematologiya)" :disabled="!!editingDept"><input v-model="deptForm.name" class="input" placeholder="Nomi"><input v-model="deptForm.icon" class="input" placeholder="🧪"><div class="row"><button class="btn primary" @click="saveDept">Saqlash</button><button class="btn" @click="showDept=false">Bekor</button></div></div></div>
    <div v-if="showContract" class="modal"><div class="modal-box"><h2>Shartnoma</h2><input v-model="contractForm.contractNo" class="input" placeholder="Shartnoma №"><input v-model.number="contractForm.total" type="number" class="input" placeholder="Jami summa"><input v-model.number="contractForm.paid" type="number" class="input" placeholder="Boshlang‘ich to‘lov"><input v-model="contractForm.patientId" class="input" placeholder="Bemor ID (ixtiyoriy)"><div class="row"><button class="btn primary" @click="saveContract">Saqlash</button><button class="btn" @click="showContract=false">Bekor</button></div></div></div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({layout:'default'})
const {request}=useApi(); const tab=ref('users'); const users=ref<any[]>([]),roles=ref<any[]>([]),services=ref<any[]>([]),departments=ref<any[]>([]),contracts=ref<any[]>([]),audit=ref<any[]>([]); const serviceSearch=ref('');
const showUser=ref(false),showService=ref(false),showDept=ref(false),showContract=ref(false);const editingUser=ref<any>(null),editingService=ref<any>(null),editingDept=ref<any>(null)
const userForm=ref<any>({name:'',login:'',password:'',roleId:'',departmentsText:''});const serviceForm=ref<any>({code:'',name:'',deptKey:'',price:0});const deptForm=ref<any>({key:'',name:'',icon:'🧪'});const contractForm=ref<any>({contractNo:'',total:0,paid:0,patientId:''})
const money=(n:number)=>new Intl.NumberFormat('uz-UZ').format(n);const fmt=(d:string)=>new Date(d).toLocaleString('uz-UZ');const exportUrl='/api/v1/reports/export'
const load=async()=>{[users.value,roles.value,services.value,departments.value,contracts.value]=await Promise.all([request('/admin/users'),request('/admin/roles'),request('/services?all=1'),request('/departments'),request('/contracts')]);audit.value=await request('/audit')}
onMounted(load); const filteredServices=computed(()=>services.value.filter(s=>!serviceSearch.value||(s.name+s.code).toLowerCase().includes(serviceSearch.value.toLowerCase())))
const editUser=(u:any)=>{editingUser.value=u;userForm.value={name:u.name,login:u.login,password:'',roleId:u.roleId,departmentsText:(u.departments||[]).map((x:any)=>x.deptKey).join(',')};showUser.value=true}
const saveUser=async()=>{const b={name:userForm.value.name,roleId:userForm.value.roleId,password:userForm.value.password||undefined,departments:userForm.value.departmentsText.split(',').map((x:string)=>x.trim()).filter(Boolean)};if(editingUser.value)await request('/admin/users/'+editingUser.value.id,{method:'PATCH',body:b});else await request('/admin/users',{method:'POST',body:{...b,login:userForm.value.login,password:userForm.value.password||'ChangeMe123!'}});showUser.value=false;editingUser.value=null;await load()}
const editService=(s:any)=>{editingService.value=s;serviceForm.value={...s};showService.value=true};const saveService=async()=>{if(editingService.value)await request('/services/'+editingService.value.id,{method:'PUT',body:serviceForm.value});else await request('/services',{method:'POST',body:serviceForm.value});showService.value=false;editingService.value=null;await load()}
const editDept=(d:any)=>{editingDept.value=d;deptForm.value={...d};showDept.value=true};const saveDept=async()=>{if(editingDept.value)await request('/departments/'+editingDept.value.key,{method:'PATCH',body:deptForm.value});else await request('/departments',{method:'POST',body:deptForm.value});showDept.value=false;editingDept.value=null;await load()}
const saveContract=async()=>{await request('/contracts',{method:'POST',body:contractForm.value});showContract.value=false;contractForm.value={contractNo:'',total:0,paid:0,patientId:''};await load()}
const importExcel=async(e:any)=>{const file=e.target.files?.[0];if(!file)return;const fd=new FormData();fd.append('file',file);await request('/services/import-excel',{method:'POST',body:fd});await load();alert('Excel import tugadi')}
</script>
