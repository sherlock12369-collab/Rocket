<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useRentalAlertStore } from '../store/rentalAlert'

const router = useRouter()
const auth = useAuthStore()
const rentalAlert = useRentalAlertStore()
const credentials = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials.value)
    })
    const data = await res.json()
    if (res.ok) {
      auth.setAuth(data.token, data.user)
      // 로그인 직후 대여 반납 기한 체크
      try {
        const checkRes = await fetch('/api/me/rental-check', {
          headers: { Authorization: `Bearer ${data.token}` }
        })
        if (checkRes.ok) {
          const checkData = await checkRes.json()
          if (checkData.alerts?.length > 0) {
            rentalAlert.setAlerts(checkData.alerts)
            // 포인트 차감이 있었다면 스토어 동기화
            if (checkData.penaltyApplied > 0) {
              auth.setAuth(data.token, { ...data.user, pointBalance: checkData.newPointBalance })
            }
          }
        }
      } catch { /* rental-check 실패해도 로그인은 정상 처리 */ }
      router.push('/')
    } else {
      error.value = data.error || '로그인 서버 오류'
    }
  } catch (err) {
    error.value = '서버 접속 불가'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-6 bg-zinc-50">
    <div class="w-full max-w-sm">
      <div class="text-center mb-12">
         <span class="text-4xl mb-6 block">🚀</span>
         <h1 class="text-4xl font-black tracking-tighter uppercase mb-4">Log in.</h1>
         <p class="text-sm text-zinc-400 font-medium">대원의 자격 증명을 입력하여 함선에 접속하세요.</p>
      </div>

      <div class="samsung-card !p-10 shadow-xl">
        <form @submit.prevent="handleLogin" class="space-y-8">
          <div v-if="error" class="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-shake">
            {{ error }}
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase text-zinc-400 tracking-widest">ID (Username)</label>
            <input v-model="credentials.username" type="text" placeholder="아이디를 입력하세요" class="w-full px-0 py-3 border-b-2 border-zinc-100 focus:outline-none focus:border-black transition-all font-bold text-lg" required />
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Password</label>
            <input v-model="credentials.password" type="password" placeholder="••••••••" class="w-full px-0 py-3 border-b-2 border-zinc-100 focus:outline-none focus:border-black transition-all font-bold text-lg" required />
          </div>

          <button :disabled="loading" type="submit" class="btn-samsung btn-samsung-black w-full py-4 uppercase tracking-widest text-sm mt-4">
            {{ loading ? 'Authenticating...' : 'Authorize' }}
          </button>
          
          <div class="text-center">
             <a href="#" class="text-[10px] font-bold text-zinc-400 hover:text-black uppercase tracking-tight">아이디/비밀번호를 분실하셨나요?</a>
          </div>
        </form>
      </div>
      
      <p class="text-center mt-12 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
        * 자격이 없는 대원은 접근할 수 없습니다.<br/>
        지휘관(부모님)에게 인증을 요청하세요.
      </p>
    </div>
  </div>
</template>
