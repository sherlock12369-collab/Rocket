<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const auctions = ref<any[]>([])
const loading = ref(true)

const newAuction = ref({
    title: '',
    description: '',
    image: '',
    startingBid: 100,
    endHours: 24, // 기본 24시간 뒤 종료
})

const fetchAuctions = async () => {
    loading.value = true
    try {
        const res = await fetch('/api/auctions', { headers: { Authorization: `Bearer ${auth.token}` } })
        if (res.ok) {
            auctions.value = await res.json()
        }
    } catch (err) { console.error(err) }
    finally { loading.value = false }
}

const handleCreateAuction = async () => {
    if (!newAuction.value.title) return alert('경매품 이름을 입력하세요.')
    
    // 현재 시간에서 설정한 시간(endHours)만큼 더하여 종료 시간 설정
    const endTime = new Date()
    endTime.setHours(endTime.getHours() + newAuction.value.endHours)

    try {
        const res = await fetch('/api/admin/auctions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
            body: JSON.stringify({
                ...newAuction.value,
                endTime: endTime.toISOString()
            })
        })
        if (!res.ok) throw new Error(await res.text())
        
        alert('희귀품이 경매장에 성공적으로 등록되었습니다! 🔨')
        newAuction.value = { title: '', description: '', image: '', startingBid: 100, endHours: 24 }
        fetchAuctions()
    } catch (err: any) {
        alert('등록 실패: ' + err.message)
    }
}

const handleDeleteAuction = async (id: string, title: string) => {
    if (!confirm(`'${title}' 경매를 강제 취소하시겠습니까? (최고 입찰자가 있다면 포인트가 환불됩니다)`)) return
    try {
        const res = await fetch(`/api/admin/auctions/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${auth.token}` }
        })
        if (!res.ok) throw new Error(await res.text())
        fetchAuctions()
    } catch (err: any) {
        alert('삭제 실패: ' + err.message)
    }
}

onMounted(() => {
    if (!auth.isAdmin) {
        router.push('/')
        return
    }
    fetchAuctions()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-7xl mx-auto px-6">
      
      <!-- Header -->
      <div class="mb-12 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-black tracking-tighter uppercase mb-2">Auction <span class="text-blue-600">Control</span></h1>
          <p class="text-sm font-bold text-gray-400">지휘관 권한으로 희귀품 경매를 주최하고 관리합니다.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left: Create Form -->
        <div class="lg:col-span-1">
          <div class="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 sticky top-24">
            <h2 class="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
                <span>➕</span> 신규 경매 등록
            </h2>
            <form @submit.prevent="handleCreateAuction" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">경매품 이름</label>
                <input v-model="newAuction.title" type="text" required class="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black" placeholder="예: [전설] 우주 사령관의 망토">
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">시작 입찰가 (P)</label>
                    <input v-model.number="newAuction.startingBid" type="number" min="1" required class="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-black text-blue-600">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">진행 시간 (Hours)</label>
                    <input v-model.number="newAuction.endHours" type="number" min="1" required class="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black">
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">이미지 URL</label>
                <input v-model="newAuction.image" type="text" class="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black" placeholder="https://...">
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">상세 설명</label>
                <textarea v-model="newAuction.description" rows="3" class="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black resize-none" placeholder="물품에 대한 묘사..."></textarea>
              </div>

              <button type="submit" class="w-full py-4 bg-black text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-blue-600 transition-colors mt-4">
                경매 등록 및 개시 🚀
              </button>
            </form>
          </div>
        </div>

        <!-- Right: Auction List -->
        <div class="lg:col-span-2 space-y-4">
            <h2 class="text-lg font-black tracking-tight mb-6 flex items-center justify-between">
                <span>📋 전체 경매 현황</span>
                <span class="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{{ auctions.length }} 건</span>
            </h2>

            <div v-if="loading" class="animate-pulse flex flex-col gap-4">
                <div v-for="n in 3" :key="n" class="h-32 bg-gray-200 rounded-2xl w-full"></div>
            </div>

            <div v-else-if="auctions.length === 0" class="bg-white p-12 text-center rounded-[24px] border border-gray-100">
                <span class="text-4xl block mb-4">💤</span>
                <p class="text-gray-400 font-bold">현재 진행 중이거나 종료된 경매가 없습니다.</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="auction in [...auctions].reverse()" :key="auction._id" class="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 relative group overflow-hidden flex flex-col">
                    
                    <div class="flex gap-4 mb-4 relative z-10">
                        <div class="w-20 h-20 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img v-if="auction.image" :src="auction.image" class="w-full h-full object-cover" />
                            <span v-else class="text-2xl">🎁</span>
                        </div>
                        <div class="flex-grow">
                            <span :class="auction.status === 'active' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'" class="px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block mb-1">
                                {{ auction.status === 'active' ? '진행중 (Active)' : '종료됨 (Ended)' }}
                            </span>
                            <h3 class="font-black text-sm tracking-tight leading-tight line-clamp-2 mb-1 cursor-default" :title="auction.title">{{ auction.title }}</h3>
                            <p class="text-[10px] text-gray-400 font-bold">{{ new Date(auction.endTime).toLocaleString() }} 마감</p>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-3 rounded-xl mb-4 relative z-10 flex-grow">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[10px] font-bold text-gray-500 uppercase">현재 최고가</span>
                            <span class="text-sm font-black text-blue-600">{{ auction.currentBid }} <span class="text-[10px] text-gray-400">P</span></span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-bold text-gray-500 uppercase">최고 입찰자</span>
                            <span class="text-xs font-bold text-gray-700 truncate max-w-[120px]">
                                {{ auction.highestBidder ? auction.highestBidder.name : '없음' }}
                            </span>
                        </div>
                    </div>

                    <button 
                        @click="handleDeleteAuction(auction._id, auction.title)"
                        class="w-full py-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors relative z-10"
                    >
                        경매 강제 취소 (환불)
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  </div>
</template>
