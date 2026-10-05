<template>
<div class="login">
  <div class="card">
    <h1>Clinika</h1><p class="muted">LabMed boshqaruv tizimi</p>
    <form @submit.prevent="submit" class="grid">
      <input v-model="login" class="input" placeholder="Login" autocomplete="username">
      <input v-model="password" class="input" placeholder="Parol" type="password" autocomplete="current-password">
      <button class="btn primary" :disabled="busy">{{ busy ? 'Kirilmoqda...' : 'Kirish' }}</button>
      <div v-if="error" class="pill">{{ error }}</div>
    </form>
  </div>
</div>
</template>
<script setup lang="ts">
definePageMeta({ layout: false })
const auth=useAuthStore(); const login=ref('admin'); const password=ref('Admin123!'); const busy=ref(false); const error=ref('')
async function submit(){busy.value=true;error.value='';try{await auth.login(login.value,password.value);await navigateTo('/')}catch(e:any){error.value='Login yoki parol noto‘g‘ri'}finally{busy.value=false}}
</script>
