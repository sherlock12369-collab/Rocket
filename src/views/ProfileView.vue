<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
const orders = ref<any[]>([])
const loadingOrders = ref(false)
const user = computed(() => auth.user)

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${auth.token}`
})

const statusLabel: Record<string, string> = {
  pending:          '승인 대기',
  approved:         '보급 중',
  fulfilled:        '보급 완료',
  rejected:         '반려됨',
  return_requested: '반납 요청 중',
  returned:         '반납 완료',
}
const statusColor: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-700',
  approved:         'bg-blue-600 text-white',
  fulfilled:        'bg-zinc-100 text-zinc-600',
  rejected:         'bg-red-100 text-red-500',
  return_requested: 'bg-orange-100 text-orange-600',
  returned:         'bg-green-100 text-green-700',
}

const fetchMyData = async () => {
  loadingOrders.value = true
  try {
    const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${auth.token}` } })
    if (res.ok) {
      const data = await res.json()
      auth.setAuth(auth.token, { ...auth.user, pointBalance: data.user.pointBalance })
      orders.value = data.orders
    }
  } catch (err) {
    console.error('프로필 로드 실패', err)
  } finally {
    loadingOrders.value = false
  }
}

const requestReturn = async (orderId: string) => {
  const isRent = orders.value.find(o => o._id === orderId)?.items?.some((i: any) => i.type === 'rent')
  const label = isRent ? '반납' : '반품'
  if (!confirm(`이 항목을 ${label} 요청하시겠습니까?\n지휘관이 승인하면 포인트가 환급됩니다.`)) return
  try {
    const res = await fetch(`/api/orders/${orderId}/request-return`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    const data = await res.json()
    alert(data.message || data.error)
    if (res.ok) fetchMyData()
  } catch {
    alert('서버 통신 오류')
  }
}

const upgrading = ref(false)
const upgradeStar = async () => {
  if (!confirm('⭐ Star 회원으로 승급하시겠습니까?\n1000P가 차감됩니다.')) return
  upgrading.value = true
  try {
    const res = await fetch('/api/me/upgrade-to-star', {
      method: 'POST',
      headers: getAuthHeaders()
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message)
      auth.setAuth(auth.token, { ...auth.user, pointBalance: data.newPointBalance, membershipTier: 'star' })
    } else {
      alert(data.error)
    }
  } catch {
    alert('서버 통신 오류')
  } finally {
    upgrading.value = false
  }
}

onMounted(fetchMyData)
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 section-padding">
    <!-- User Header Card -->
    <div class="samsung-card mb-12 flex flex-col md:flex-row items-center gap-10 bg-zinc-900 text-white border-none shadow-2xl">
      <div class="w-32 h-32 rounded-full border-4 border-zinc-800 p-1 flex-shrink-0">
        <div class="w-full h-full bg-zinc-700 rounded-full flex items-center justify-center text-5xl">
          {{ user?.role === 'admin' ? '🛸' : (user as any)?.membershipTier === 'star' ? '⭐' : '🚀' }}
        </div>
      </div>
      <div class="text-center md:text-left flex-grow">
        <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
          <span
            class="inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full"
            :class="user?.role === 'admin' ? 'bg-blue-600' : 'bg-zinc-700 text-zinc-300'"
          >
            {{ user?.role === 'admin' ? 'Commander ⭐' : 'Explorer 🚀' }}
          </span>
          <span
            v-if="user?.membershipTier === 'star'"
            class="inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-yellow-400 text-black"
          >
            ⭐ Star Member
          </span>
        </div>
        <h1 class="text-4xl font-black tracking-tighter mb-2">{{ user?.name }}</h1>
        <p class="text-zinc-500 font-medium">@{{ user?.username || user?.name }} · Galaxy Voyager Status: <span class="text-blue-500">Active</span></p>
      </div>
      <div class="md:border-l md:border-zinc-800 md:pl-10 text-center md:text-right">
        <div class="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Available Points</div>
        <div class="text-4xl font-black tracking-tighter">{{ user?.pointBalance?.toLocaleString() ?? '...' }} <span class="text-sm text-zinc-600">P</span></div>
      </div>
    </div>

    <!-- Star 업그레이드 배너 (일반 회원만) -->
    <div v-if="user?.membershipTier !== 'star'" class="mb-10 rounded-3xl border-2 border-yellow-300 bg-yellow-50 p-6">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <p class="text-lg font-black tracking-tight mb-1">⭐ Star 회원 혜택</p>
          <ul class="text-xs text-zinc-600 space-y-0.5 font-medium">
            <li>📦 배송비 무료</li>
            <li>↩️ 환불 60% 환급 (일반 50%)</li>
            <li>🛒 5개 이상 주문 시 50% 할인</li>
          </ul>
        </div>
        <button
          @click="upgradeStar"
          :disabled="upgrading"
          class="flex-shrink-0 px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
        >
          {{ upgrading ? '승급 중...' : '⭐ Star 승급 (1000P)' }}
        </button>
      </div>
    </div>

    <!-- Order History -->
    <div class="mb-8 flex justify-between items-end px-2">
      <h2 class="text-2xl font-black tracking-tighter uppercase">최근 주문 내역</h2>
      <span class="text-[10px] font-black text-zinc-400">{{ orders.length }} LOGS</span>
    </div>

    <div v-if="loadingOrders" class="py-16 text-center opacity-40">
      <div class="inline-block w-6 h-6 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-4">
      <div v-for="order in orders" :key="order._id" class="samsung-card group">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase" :class="statusColor[order.status] || 'bg-zinc-100 text-zinc-500'">
                {{ statusLabel[order.status] || order.status }}
              </span>
              <span class="text-[10px] font-bold text-zinc-300 font-mono">#{{ order._id?.slice(-6) }}</span>
            </div>
            <h3 class="text-lg font-bold group-hover:text-blue-700 transition-colors">
              {{ order.items?.map((i: any) => i.title).join(', ') || '주문 내역' }}
            </h3>
            <span class="text-xs text-zinc-400 font-medium">{{ new Date(order.createdAt).toLocaleDateString('ko-KR') }}</span>
          </div>
          <div class="text-right flex-shrink-0 ml-4">
            <div class="text-xl font-black mb-2">{{ order.totalPrice?.toLocaleString() }} P</div>
            <!-- 반납/반품 요청 버튼: fulfilled 상태만 -->
            <button
              v-if="order.status === 'fulfilled'"
              @click="requestReturn(order._id)"
              class="text-[10px] font-black uppercase px-4 py-2 border border-zinc-200 rounded-full hover:border-orange-300 hover:text-orange-500 transition-all"
            >
              {{ order.items?.some((i: any) => i.type === 'rent') ? '📦 반납 요청' : '↩️ 반품 요청' }}
            </button>
            <span v-else class="text-[9px] font-black text-zinc-300 uppercase">{{ order.status }}</span>
          </div>
        </div>
      </div>

      <div v-if="orders.length === 0" class="samsung-card py-16 text-center border-dashed border-2 border-zinc-100">
        <p class="text-3xl mb-2">📭</p>
        <p class="text-[10px] font-black uppercase text-zinc-400">아직 주문 내역이 없습니다</p>
      </div>
    </div>
  </div>
</template>
