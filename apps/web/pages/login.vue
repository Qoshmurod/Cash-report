<template>
<div class="login">
  <div class="card">
    <h1>Clinika</h1><p class="muted">LabMed boshqaruv tizimi</p>
    <form @submit.prevent="submit" class="grid">
      <input v-model="login" class="input" placeholder="Login" autocomplete="username">
      <div class="password-field">
        <input v-model="password" class="input password-input" placeholder="Parol" :type="showPassword ? 'text' : 'password'" autocomplete="current-password">
        <button
          class="password-toggle"
          type="button"
          :aria-label="showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'"
          :aria-pressed="showPassword"
          :disabled="busy"
          @click="showPassword = !showPassword"
        >
          <svg v-if="!showPassword" aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          <svg v-else aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="m3 3 18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15.8 15.8 0 0 1-3.1 3.6M6.2 6.2C3.8 7.7 2.5 12 2.5 12s3.4 6 9.5 6c1 0 2-.2 2.8-.5" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        </button>
      </div>
      <button class="btn primary" :disabled="busy">{{ busy ? 'Kirilmoqda...' : 'Kirish' }}</button>
      <div v-if="error" class="pill">{{ error }}</div>
    </form>
  </div>
</div>
</template>
<script setup lang="ts">
definePageMeta({ layout: false })
const auth=useAuthStore(); const login=ref(''); const password=ref(''); const showPassword=ref(false); const busy=ref(false); const error=ref('')
async function submit(){busy.value=true;error.value='';try{await auth.login(login.value,password.value);await navigateTo('/')}catch(e:any){error.value='Login yoki parol noto‘g‘ri'}finally{busy.value=false}}
</script>
<style scoped>
.password-field {
  position: relative;
}

.password-input {
  padding-right: 46px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  transform: translateY(-50%);
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.password-toggle:hover:not(:disabled) {
  color: #e5e7eb;
}

.password-toggle:focus-visible {
  outline: 2px solid #22d3ee;
  outline-offset: 2px;
}

.password-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.password-toggle svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}
</style>
