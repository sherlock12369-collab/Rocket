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
      // 데이터베이스의 최신 등급 정보를 스토어에 반영하여 ⭐ 아이콘 업데이트
      auth.setAuth(auth.token, { 
        ...auth.user, 
        pointBalance: data.user.pointBalance,
        membershipTier: data.user.membershipTier || 'normal'
      })
      orders.value = data.orders
    }
  } catch (err) {
    console.error('프로필 로드 실패', err)
  } finally {
    loadingOrders.value = false
  }
}

// requestReturn 함수 제거 (requestItemReturn으로 통합됨)

// ─── Individual Item Operations ────────────────────────────
const requestItemReturn = async (orderId: string, itemId: string, itemTitle: string, isRent: boolean) => {
  const label = isRent ? '반납' : '반품'
  if (!confirm(`'${itemTitle}' 항목만 따로 ${label} 요청하시겠습니까?`)) return
  try {
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}/request-return`, {
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

// ─── Notification Operations ──────────────────────────────
const notifications = computed(() => (user.value as any)?.notifications?.slice().reverse() || [])

const markNotifAsRead = async (notifId: string) => {
  try {
    // API 구현 예정 (우선 로컬 UI에서 처리하거나 fetchMyData)
    await fetch(`/api/me/notifications/${notifId}/read`, { method: 'PATCH', headers: getAuthHeaders() })
    fetchMyData()
  } catch {}
}

const clearAllNotifs = async () => {
  if (!confirm('모든 알림을 삭제하시겠습니까?')) return
  try {
    await fetch('/api/me/notifications/clear', { method: 'DELETE', headers: getAuthHeaders() })
    fetchMyData()
  } catch {}
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

// ─── Address Management ────────────────────────────────────
const newAddress = ref('')
const addAddress = async () => {
  if (!newAddress.value.trim()) return
  try {
    const res = await fetch('/api/me/addresses', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ address: newAddress.value.trim() })
    })
    if (res.ok) {
      newAddress.value = ''
      fetchMyData()
    }
  } catch {}
}

const removeAddress = async (address: string) => {
  if (!confirm('이 주소를 삭제하시겠습니까?')) return
  try {
    const res = await fetch('/api/me/addresses', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ address })
    })
    if (res.ok) fetchMyData()
  } catch {}
}

// ─── Supply Sell Registration ──────────────────────────────
const showSellModal = ref(false)
const selling = ref(false)
const sellForm = ref({
  title: '',
  description: '',
  price: 0,
  category: 'Toy',
  image: '',
  type: 'buy'
})
const sellPreview = ref('')

const handleSellFileUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onloadend = () => {
    const result = reader.result as string
    sellForm.value.image = result
    sellPreview.value = result
  }
  reader.readAsDataURL(file)
}

const submitProduct = async () => {
  if (!sellForm.value.title || sellForm.value.price <= 0) {
    alert('상품명과 가격(1P 이상)을 입력하세요.')
    return
  }
  selling.value = true
  try {
    const res = await fetch('/api/products/sell', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(sellForm.value)
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message)
      showSellModal.value = false
      sellForm.value = { title: '', description: '', price: 0, category: 'Toy', image: '', type: 'buy' }
      sellPreview.value = ''
    } else {
      alert(data.error || '등록 실패')
    }
  } catch {
    alert('서버 통신 오류')
  } finally {
    selling.value = false
  }
}

onMounted(fetchMyData)
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 section-padding">
    <!-- Notifications Section -->
    <div v-if="notifications.length > 0" class="mb-10 space-y-3">
      <div class="flex justify-between items-center px-2 mb-4">
        <h2 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          🛰️ System Alerts
          <span class="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[8px]">{{ notifications.filter((n:any) => !n.read).length }}</span>
        </h2>
        <button @click="clearAllNotifs" class="text-[9px] font-black uppercase text-zinc-300 hover:text-red-500 transition-colors">Clear All Logs</button>
      </div>
      <div 
        v-for="notif in notifications.slice(0, 5)" :key="notif._id"
        class="p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all"
        :class="notif.read ? 'bg-zinc-50/30 border-zinc-100 opacity-60' : 'bg-white border-blue-100 shadow-sm'"
      >
        <div class="flex items-center gap-4">
          <div class="w-2 h-2 rounded-full" :class="notif.read ? 'bg-zinc-200' : 'bg-blue-600'"></div>
          <p class="text-xs font-bold text-zinc-800">{{ notif.message }}</p>
        </div>
        <button v-if="!notif.read" @click="markNotifAsRead(notif._id)" class="text-[9px] font-black uppercase text-blue-600 hover:underline">Check</button>
      </div>
    </div>

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

    <!-- My Addresses Section -->
    <div class="mb-10 samsung-card bg-zinc-50/50 border-zinc-100 p-8 rounded-3xl">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-sm font-black uppercase tracking-widest text-zinc-400">📍 My Addresses</h2>
        <span class="text-[10px] font-black text-zinc-300 uppercase">{{ (user as any)?.savedAddresses?.length || 0 }} SAVED</span>
      </div>
      <div class="space-y-3 mb-6">
        <div v-for="addr in (user as any)?.savedAddresses" :key="addr" class="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-100 group shadow-sm transition-all hover:border-zinc-300">
          <span class="text-sm font-bold text-zinc-700">{{ addr }}</span>
          <button @click="removeAddress(addr)" class="opacity-0 group-hover:opacity-100 text-[9px] font-black uppercase text-red-500 hover:scale-110 transition-all">Delete</button>
        </div>
      </div>
      <div class="flex gap-2">
        <input 
          v-model="newAddress" 
          @keyup.enter="addAddress" 
          type="text" 
          placeholder="새로운 배송지 추가 (예: 내방책상, 거실소파)" 
          class="flex-grow px-5 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-black shadow-inner" 
        />
        <button 
          @click="addAddress" 
          class="px-8 py-3 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-black transition-all shadow-lg active:scale-95"
        >
          Add
        </button>
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

    <!-- Sell Supply Button -->
    <div class="mb-14 text-center">
      <button 
        @click="showSellModal = true"
        class="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white px-10 py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 mx-auto transition-all transform hover:scale-105 active:scale-95"
      >
        🛰️ 보급품 판매 등록하기
      </button>
      <p class="text-[10px] text-zinc-400 font-bold mt-4 uppercase tracking-tighter">함선 본부에 보급품을 제안하세요. 지휘관의 승인 후 상점에 공개됩니다.</p>
    </div>

    <!-- Order History -->
    <div class="mb-8 flex justify-between items-end px-2">
      <h2 class="text-2xl font-black tracking-tighter uppercase">최근 주문 내역</h2>
      <span class="text-[10px] font-black text-zinc-400">{{ orders.length }} LOGS</span>
    </div>

    <div v-if="loadingOrders" class="py-16 text-center opacity-40">
      <div class="inline-block w-6 h-6 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-6">
      <div v-for="order in orders" :key="order._id" class="samsung-card group p-0 overflow-hidden border-zinc-100">
        <!-- Order Header -->
        <div class="p-6 bg-zinc-50/50 border-b border-zinc-100 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <span class="px-3 py-1 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-widest">
              {{ statusLabel[order.status] || order.status }}
            </span>
            <span class="text-[10px] font-black text-zinc-300 font-mono">#{{ order._id?.slice(-6) }}</span>
            <span class="text-[10px] font-bold text-zinc-400">{{ new Date(order.createdAt).toLocaleDateString('ko-KR') }}</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-black">{{ order.totalPrice?.toLocaleString() }} P</span>
          </div>
        </div>

        <!-- Order Items (Individual) -->
        <div class="divide-y divide-zinc-50">
          <div v-for="item in order.items" :key="item._id" class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-zinc-50/30 transition-colors">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-lg">
                {{ item.type === 'rent' ? '🔄' : '🛒' }}
              </div>
              <div>
                <h4 class="text-sm font-bold text-zinc-800">{{ item.title }}</h4>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[10px] font-black uppercase" :class="statusColor[item.status] || 'text-zinc-300'">{{ statusLabel[item.status] || item.status }}</span>
                  <span class="text-[10px] text-zinc-300 font-medium">{{ item.price.toLocaleString() }}P x {{ item.quantity }}</span>
                </div>
              </div>
            </div>

            <!-- Individual Action Button -->
            <div v-if="order.status === 'fulfilled' && item.status === 'fulfilled'">
              <button 
                @click="requestItemReturn(order._id, item._id, item.title, item.type === 'rent')"
                class="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white text-[10px] font-black uppercase rounded-xl shadow-lg transition-all transform active:scale-95"
              >
                {{ item.type === 'rent' ? '📦 별도 반납' : '↩️ 별도 반품' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer / Delivery Address -->
        <div v-if="order.deliveryAddress" class="px-6 py-3 bg-zinc-50/30 text-[10px] font-bold text-zinc-400 flex items-center gap-2">
          📍 Delivery to: <span class="text-zinc-600">{{ order.deliveryAddress }}</span>
        </div>
      </div>

      <div v-if="orders.length === 0" class="samsung-card py-16 text-center border-dashed border-2 border-zinc-100">
        <p class="text-3xl mb-2">📭</p>
        <p class="text-[10px] font-black uppercase text-zinc-400">아직 주문 내역이 없습니다</p>
      </div>
    </div>

    <!-- ─ Sell Product Modal ─ -->
    <Teleport to="body">
      <div v-if="showSellModal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-8 shadow-2xl">
          <div class="flex justify-between items-start mb-8">
            <div>
              <h2 class="text-2xl font-black uppercase tracking-tighter">보급품 제안 등록</h2>
              <p class="text-[10px] font-bold text-zinc-400 mt-1 uppercase">Supply Proposal Registration</p>
            </div>
            <button @click="showSellModal = false" class="text-zinc-400 hover:text-black text-2xl leading-none">✕</button>
          </div>

          <form @submit.prevent="submitProduct" class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">보급품 이름 *</label>
                <input v-model="sellForm.title" type="text" placeholder="예: 빈티지 광선총" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm" required />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">카테고리</label>
                <select v-model="sellForm.category" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm">
                  <option value="Toy">장난감</option>
                  <option value="Snack">간식</option>
                  <option value="Coupon">쿠폰</option>
                  <option value="ETC">기타</option>
                </select>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">상세 설명</label>
              <textarea v-model="sellForm.description" rows="3" placeholder="대원들에게 이 아이템을 매력적으로 설명해 주세요." class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black font-medium text-sm resize-none"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">희망 가격 (P) *</label>
                <input v-model.number="sellForm.price" type="number" min="1" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">거래 유형</label>
                <select v-model="sellForm.type" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black font-bold text-sm">
                  <option value="buy">🛒 판매</option>
                  <option value="rent">🔄 대여 (반납 필요)</option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase text-zinc-400">아이템 이미지</label>
              <div class="flex gap-3">
                <input v-model="sellForm.image" type="text" placeholder="https://이미지 URL..." class="flex-grow px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black text-sm" />
                <label class="flex-shrink-0 cursor-pointer px-5 py-3 bg-zinc-100 hover:bg-zinc-200 rounded-2xl text-xs font-black uppercase flex items-center gap-1 transition-colors">
                  📁 파일
                  <input type="file" accept="image/*" class="hidden" @change="handleSellFileUpload" />
                </label>
              </div>
              <div v-if="sellPreview" class="w-full aspect-video bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200">
                <img :src="sellPreview" class="w-full h-full object-contain" />
              </div>
            </div>

            <div class="pt-6 border-t border-zinc-50">
              <button :disabled="selling" type="submit" class="btn-samsung btn-samsung-black w-full py-4 uppercase tracking-widest text-sm shadow-xl">
                {{ selling ? '제안 전송 중...' : '🚀 본부에 보급 제안하기' }}
              </button>
              <p class="text-[10px] text-zinc-400 font-bold mt-4 text-center uppercase">판매 가격의 10%는 함선 운영 수수료로 자동 차감됩니다.</p>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
