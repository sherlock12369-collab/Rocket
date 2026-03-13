<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${auth.token}`
})

const orders = ref<any[]>([])
const loading = ref(false)

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/admin/orders', { headers: getAuthHeaders() })
    if (res.ok) orders.value = await res.json()
  } catch (err) {
    console.error('주문 목록 로드 실패:', err)
  } finally {
    loading.value = false
  }
}

const updateStatus = async (id: string, status: string) => {
  try {
    const res = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    })
    if (res.ok) fetchOrders()
    else { const data = await res.json(); alert(`오류: ${data.error}`) }
  } catch { alert('서버 통신 오류') }
}

const updateItemStatus = async (orderId: string, itemId: string, status: string) => {
  if (!confirm(`아이템 상태를 '${status}'(으)로 변경하시겠습니까?`)) return
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    })
    const data = await res.json()
    alert(data.message)
    if (res.ok) fetchOrders()
  } catch (err) {
    alert('아이템 상태 업데이트 실패')
  }
}

onMounted(fetchOrders)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 section-padding">
    <div class="mb-12 flex justify-between items-end">
      <div>
        <h1 class="text-samsung-header">Logistics <br/> <span class="text-zinc-400">Control.</span></h1>
        <p class="text-lg text-zinc-500 font-medium text-gradient">함선의 모든 보급 현황을 실시간으로 제어하고 승인하세요.</p>
      </div>
      <button @click="fetchOrders" class="text-xs font-black uppercase text-zinc-400 hover:text-black transition-colors">리프레시 🔄</button>
    </div>

    <div v-if="loading" class="py-20 text-center opacity-50">
       <div class="inline-block w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin mb-4"></div>
       <p class="text-[10px] font-black uppercase tracking-widest">Accessing Ship Logs...</p>
    </div>

    <div v-else class="samsung-card overflow-hidden !p-0">
      <table class="w-full text-left border-collapse">
        <thead class="bg-zinc-50 border-b border-zinc-100">
          <tr>
            <th class="px-8 py-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Order ID</th>
            <th class="px-8 py-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Member</th>
            <th class="px-8 py-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Items</th>
            <th class="px-8 py-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Total</th>
            <th class="px-8 py-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Status</th>
            <th class="px-8 py-5 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order._id" class="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors group">
            <td class="px-8 py-6 font-mono text-xs text-zinc-400">#{{ order._id.slice(-6) }}</td>
            <td class="px-8 py-6">
               <div class="font-bold text-zinc-800">{{ order.userId?.name || 'Unknown' }}</div>
               <div class="text-[9px] text-zinc-400 uppercase font-black mb-1">@{{ order.userId?.username }}</div>
               <div v-if="order.deliveryAddress" class="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md inline-block font-medium">
                 📍 {{ order.deliveryAddress }}
               </div>
            </td>
            <td class="px-8 py-6 text-xs text-zinc-500">
              <div v-for="(i, idx) in order.items" :key="idx" class="mb-3 p-3 bg-zinc-50 rounded-xl last:mb-0">
                <div class="flex justify-between items-start mb-2">
                  <div class="font-bold text-zinc-800">{{ i.title }}</div>
                  <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase" 
                    :class="[i.status === 'fulfilled' ? 'bg-zinc-200 text-zinc-600' : 'bg-blue-100 text-blue-600']">
                    {{ i.status || 'pending' }}
                  </span>
                </div>
                <!-- 아이템별 개별 제어 버튼 -->
                <div class="flex gap-1 flex-wrap">
                  <button v-if="i.status === 'pending'" @click="updateItemStatus(order._id, i._id, 'approved')" class="text-[8px] font-black bg-white border border-zinc-200 px-2 py-1 rounded-md hover:bg-black hover:text-white transition-all">승인</button>
                  <button v-if="i.status === 'approved'" @click="updateItemStatus(order._id, i._id, 'fulfilled')" class="text-[8px] font-black bg-zinc-900 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-all">배송</button>
                  <button v-if="i.status === 'return_requested'" @click="updateItemStatus(order._id, i._id, 'returned')" class="text-[8px] font-black bg-orange-500 text-white px-2 py-1 rounded-md hover:bg-orange-600 transition-all">반납승인</button>
                  <button v-if="i.status === 'pending' || i.status === 'approved'" @click="updateItemStatus(order._id, i._id, 'rejected')" class="text-[8px] font-black text-zinc-400 hover:text-red-500 px-2 py-1">반려</button>
                </div>
              </div>
            </td>
            <td class="px-8 py-6 font-black text-blue-700">{{ order.totalPrice.toLocaleString() }} P</td>
            <td class="px-8 py-6">
              <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase" 
                :class="{
                  'bg-yellow-100 text-yellow-700': order.status === 'pending',
                  'bg-blue-100 text-blue-700': order.status === 'approved',
                  'bg-zinc-100 text-zinc-600': order.status === 'fulfilled',
                  'bg-red-100 text-red-700': order.status === 'rejected',
                  'bg-orange-100 text-orange-600': order.status === 'return_requested',
                  'bg-green-100 text-green-700': order.status === 'returned',
                }">
                {{
                  order.status === 'pending' ? '승인대기' :
                  order.status === 'approved' ? '배송중' :
                  order.status === 'fulfilled' ? '배송완료' :
                  order.status === 'rejected' ? '반려' :
                  order.status === 'return_requested' ? (order.items?.some((i: any) => i.type === 'rent') ? '반납요청' : '반품요청') :
                  order.status === 'returned' ? (order.items?.some((i: any) => i.type === 'rent') ? '반납완료' : '반품완료') : order.status
                }}
              </span>
            </td>
            <td class="px-8 py-6 text-right">
              <div class="flex justify-end gap-2 flex-wrap">
                <button v-if="order.status === 'pending'" @click="updateStatus(order._id, 'approved')" class="text-[9px] font-black uppercase px-4 py-2 border border-zinc-200 rounded-full hover:bg-black hover:text-white transition-all">승인</button>
                <button v-if="order.status === 'approved'" @click="updateStatus(order._id, 'fulfilled')" class="text-[9px] font-black uppercase px-4 py-2 border border-zinc-100 bg-zinc-900 text-white rounded-full hover:bg-blue-700 transition-all">배송완료</button>
                <button v-if="order.status === 'pending' || order.status === 'approved'" @click="updateStatus(order._id, 'rejected')" class="text-[9px] font-black uppercase px-4 py-2 text-zinc-300 hover:text-red-500 hover:border-red-100 border border-transparent transition-all">반려</button>
                <!-- 반납/반품 요청이 들어온 경우 -->
                <button v-if="order.status === 'return_requested'" @click="updateStatus(order._id, 'returned')" class="text-[9px] font-black uppercase px-4 py-2 border border-orange-200 text-orange-500 rounded-full hover:bg-orange-500 hover:text-white transition-all">
                  {{ order.items?.some((i: any) => i.type === 'rent') ? '반납 승인' : '반품 승인' }}
                </button>
                <button v-if="order.status === 'return_requested'" @click="updateStatus(order._id, 'fulfilled')" class="text-[9px] font-black uppercase px-4 py-2 text-zinc-300 hover:text-red-500 border border-transparent hover:border-red-100 transition-all">반려</button>
                <span v-if="order.status === 'returned' || order.status === 'rejected'" class="text-[10px] font-bold text-zinc-300 uppercase italic">
                  {{ order.status === 'rejected' ? 'Rejected' : (order.items?.some((i: any) => i.type === 'rent') ? 'Returned' : 'Refunded') }}
                </span>
              </div>
            </td>
          </tr>
          <tr v-if="orders.length === 0">
             <td colspan="6" class="px-8 py-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">보급 요청 내역이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
