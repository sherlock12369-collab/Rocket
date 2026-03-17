<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const auctions = ref<any[]>([])
const loading = ref(true)
const bidAmounts = ref<Record<string, number>>({})
const errorMsg = ref('')

let timer: any = null

const fetchAuctions = async () => {
  try {
    const res = await fetch('/api/auctions', { headers: { Authorization: `Bearer ${auth.token}` } })
    if (res.ok) {
      auctions.value = await res.json()
      // 초기 입찰가 세팅 (현재가 + 10)
      auctions.value.forEach(a => {
        if (!bidAmounts.value[a._id]) bidAmounts.value[a._id] = a.currentBid + 10
      })
    }
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

const placeBid = async (auctionId: string) => {
  if (!auth.isAuthenticated) return router.push('/auth/login')
  const amount = bidAmounts.value[auctionId]
  
  if (!confirm(`정말 ${amount}P로 입찰하시겠습니까? (현재 1등 당첨 시 즉시 차감)`)) return

  errorMsg.value = ''
  try {
    const res = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ bidAmount: amount })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    
    auth.setAuth(auth.token, { ...auth.user, pointBalance: data.pointBalance })
    alert('입찰 성공! 현재 1위로 등극했습니다. 🎉')
    await fetchAuctions()

  } catch (err: any) {
    errorMsg.value = err.message
    alert(`입찰 실패: ${err.message}`)
  }
}

// 타이머 형식 변환 (남은 시간)
const getRemainingTime = (endTimeStr: string) => {
  const diff = new Date(endTimeStr).getTime() - new Date().getTime()
  if (diff <= 0) return '경매 종료'
  
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((diff % (1000 * 60)) / 1000)
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

onMounted(() => {
  fetchAuctions()
  // 1초마다 화면 강제 렌더링(타이머 갱신)을 위해 빈 반응형 변수 업데이트 대신, 전체 리스트 재할당 방식 사용 
  timer = setInterval(() => {
    auctions.value = [...auctions.value]
  }, 1000) 
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="min-h-screen bg-zinc-50 pb-20">
    <section class="bg-black text-white pt-24 pb-16 px-6 relative overflow-hidden">
      <div class="max-w-7xl mx-auto relative z-10 text-center">
        <h1 class="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4"><span class="text-blue-500">Rocket</span> Auction</h1>
        <p class="text-zinc-400 font-medium tracking-wide">지휘관이 하사하는 희귀 전리품을 쟁취하십시오.</p>
        <div class="mt-8 flex justify-center">
            <span class="px-6 py-2 bg-white/10 rounded-full font-black text-sm tracking-widest text-blue-400">내 작전 포인트: {{ auth.user?.pointBalance?.toLocaleString() }} P</span>
        </div>
      </div>
      <!-- Bg Deco -->
      <div class="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
        <div class="w-[800px] h-[800px] border border-blue-500 rounded-full animate-spin-slow" style="animation-duration: 20s;"></div>
      </div>
    </section>

    <main class="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="n in 3" :key="n" class="h-[450px] bg-white rounded-3xl animate-pulse shadow-xl"></div>
      </div>

      <div v-else-if="auctions.length === 0" class="bg-white rounded-3xl p-20 text-center shadow-xl">
        <div class="text-6xl mb-6">🌌</div>
        <h2 class="text-2xl font-black tracking-tight text-zinc-400 uppercase">진행 중인 경매가 없습니다.</h2>
        <p class="text-sm mt-4 text-zinc-300">지휘관의 특별 보급을 기다려주세요.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div 
          v-for="auction in auctions" :key="auction._id" 
          class="bg-white rounded-[32px] p-6 shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all flex flex-col relative overflow-hidden group"
        >
          <!-- 종료/경고 배지 -->
          <div v-if="auction.status === 'ended'" class="absolute -right-12 top-8 bg-zinc-800 text-white font-black text-xs px-12 py-1.5 rotate-45 z-10 uppercase tracking-widest shadow-lg">Ended</div>
          
          <div class="aspect-video bg-zinc-50 rounded-2xl mb-6 overflow-hidden relative flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            <img v-if="auction.image" :src="auction.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <span v-else class="text-6xl group-hover:scale-110 transition-transform duration-500">💎</span>
          </div>

          <div class="flex-grow flex flex-col">
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-2xl font-black uppercase tracking-tight leading-none">{{ auction.title }}</h3>
            </div>
            <p class="text-zinc-400 text-sm mb-6 flex-grow leading-relaxed">{{ auction.description }}</p>

            <div class="bg-zinc-50 p-5 rounded-2xl mb-6 border border-zinc-100 relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
                <div class="flex justify-between items-center mb-2 relative z-10">
                    <span class="text-xs font-black text-zinc-400 uppercase tracking-widest">현재 최고입찰가</span>
                    <span class="text-2xl font-black text-blue-600">{{ auction.currentBid.toLocaleString() }} <span class="text-xs text-zinc-400">P</span></span>
                </div>
                <!-- 최고 입찰자 정보 -->
                <div class="flex items-center gap-2 mt-3 p-2 bg-white rounded-xl shadow-sm relative z-10">
                    <div class="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center text-[10px]">👑</div>
                    <span class="text-xs font-bold text-zinc-600 truncate flex-grow">
                        {{ auction.highestBidder?.name || '아직 입찰자가 없습니다!' }}
                    </span>
                    <span v-if="auction.highestBidder?._id === auth.user?._id" class="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black rounded-full uppercase">나의 입찰</span>
                </div>
            </div>

            <div v-if="auction.status === 'active'" class="flex items-center gap-4">
                <div class="flex-grow">
                    <p class="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1.5">희망 입찰가 설정</p>
                    <div class="relative">
                        <input 
                            v-model.number="bidAmounts[auction._id]" 
                            type="number" 
                            :min="auction.currentBid + 1"
                            class="w-full bg-zinc-100 border-none rounded-xl px-4 py-3 text-lg font-black pr-10 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                        />
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">P</span>
                    </div>
                </div>
                <button 
                    @click="placeBid(auction._id)"
                    class="h-[52px] px-8 bg-black text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-blue-600 hover:-translate-y-1 transition-all shadow-xl hover:shadow-blue-500/30 mt-[22px] flex-shrink-0"
                >
                    입찰
                </button>
            </div>
            
            <div class="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between">
                <div class="flex items-center gap-2 text-zinc-400">
                    <span class="text-lg animate-pulse" :class="auction.status === 'active' ? 'text-red-500' : ''">⏱</span>
                    <span class="font-black text-sm font-mono tracking-wider" :class="auction.status === 'active' ? 'text-black' : ''">
                        {{ getRemainingTime(auction.endTime) }}
                    </span>
                </div>
                <span class="text-[10px] uppercase font-bold text-zinc-300 tracking-widest">Starts at {{ auction.startingBid }}P</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
