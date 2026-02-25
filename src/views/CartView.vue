<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../store/cart'
import { useAuthStore } from '../store/auth'
import { RouterLink } from 'vue-router'

const cart = useCartStore()
const auth = useAuthStore()
const router = useRouter()

const ordering = ref(false)
const orderResult = ref({ show: false, success: true, msg: '' })

const showMsg = (success: boolean, msg: string) => {
  orderResult.value = { show: true, success, msg }
  setTimeout(() => orderResult.value.show = false, 4000)
}

const placeOrder = async () => {
  if (cart.items.length === 0) return
  if (!auth.isAuthenticated) return router.push('/auth/login')
  ordering.value = true
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        items: cart.items.map(i => ({ productId: i._id, title: i.title, price: i.price, quantity: i.quantity, type: i.type })),
      })
    })
    const data = await res.json()
    if (res.ok) {
      // 포인트 잔액 업데이트
      auth.setAuth(auth.token, { ...auth.user, pointBalance: data.newBalance })
      cart.clearCart()
      showMsg(true, `주문 완료! 잔여 포인트: ${data.newBalance.toLocaleString()} P`)
    } else {
      showMsg(false, data.error || '주문 실패')
    }
  } catch {
    showMsg(false, '서버 연결 오류')
  } finally {
    ordering.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 section-padding">
    <div class="mb-12">
      <h1 class="text-samsung-header">Your <br/><span class="text-zinc-400">Inventory.</span></h1>
      <p class="text-zinc-500 font-medium">보급창고에 담긴 아이템을 확인하고 주문하세요.</p>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="orderResult.show"
        class="fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm transition-all"
        :class="orderResult.success ? 'bg-black text-white' : 'bg-red-500 text-white'">
        {{ orderResult.msg }}
      </div>
    </Teleport>

    <!-- Empty State -->
    <div v-if="cart.items.length === 0" class="samsung-card py-32 text-center">
      <p class="text-5xl mb-6">🛒</p>
      <p class="text-zinc-400 font-bold mb-8 uppercase tracking-widest text-sm">보급창고가 비어 있습니다.</p>
      <RouterLink to="/" class="btn-samsung btn-samsung-black px-12 py-4 text-sm uppercase tracking-widest">보급품 구경하러 가기</RouterLink>
    </div>

    <!-- Cart Content -->
    <div v-else class="grid lg:grid-cols-3 gap-12">
      <!-- Items -->
      <div class="lg:col-span-2 space-y-4">
        <div v-for="item in cart.items" :key="item._id" class="samsung-card flex items-center gap-6 group">
          <div class="w-20 h-20 bg-zinc-50 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-3xl">
            <img v-if="item.image" :src="item.image" class="w-full h-full object-contain" @error="(e:any) => e.target.style.display='none'" />
            <span v-else>📦</span>
          </div>
          <div class="flex-grow">
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-bold tracking-tight">{{ item.title }}</h3>
              <button @click="cart.removeItem(item._id)" class="text-zinc-200 hover:text-red-500 transition-colors text-lg leading-none">✕</button>
            </div>
            <div class="flex justify-between items-center">
              <div class="flex items-center bg-zinc-100 rounded-full px-3 py-1.5 gap-3 border border-zinc-200">
                <button @click="cart.decreaseQty(item._id)" class="font-black text-sm text-zinc-400 hover:text-black w-5 h-5 flex items-center justify-center">−</button>
                <span class="text-sm font-black min-w-[20px] text-center">{{ item.quantity }}</span>
                <button @click="cart.increaseQty(item._id)" class="font-black text-sm text-zinc-400 hover:text-black w-5 h-5 flex items-center justify-center">+</button>
              </div>
              <div class="text-lg font-black">{{ (item.price * item.quantity).toLocaleString() }} P</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Checkout -->
      <div>
        <div class="samsung-card bg-zinc-50 border-none sticky top-24">
          <h2 class="text-xl font-black mb-6 border-b border-zinc-200 pb-4 uppercase tracking-tighter">Check-out</h2>

          <!-- Point Balance -->
          <div v-if="auth.isAuthenticated" class="mb-6 p-4 bg-white rounded-2xl border border-zinc-100">
            <div class="text-[10px] font-black uppercase text-zinc-400 mb-1">내 보유 포인트</div>
            <div class="text-2xl font-black">{{ auth.user?.pointBalance?.toLocaleString() }} <span class="text-xs text-zinc-300">P</span></div>
          </div>

          <div class="space-y-3 mb-6">
            <div class="flex justify-between text-sm font-bold text-zinc-500">
              <span>아이템 합계</span>
              <span class="text-black">{{ cart.totalPrice.toLocaleString() }} P</span>
            </div>
            <div class="flex justify-between text-sm font-bold text-zinc-500">
              <span>배송비</span>
              <span :class="cart.shippingFee === 0 ? 'text-blue-600' : 'text-black'">
                {{ cart.shippingFee === 0 ? 'FREE ✨' : `${cart.shippingFee} P` }}
              </span>
            </div>
            <div v-if="!cart.isFreeShipping" class="text-[10px] text-blue-500 font-medium">
              💡 {{ cart.remainingForFree.toLocaleString() }} P 더 담으면 무료배송!
            </div>
            <div class="pt-4 border-t border-zinc-200 flex justify-between items-center">
              <span class="text-sm font-black uppercase tracking-widest">Total</span>
              <span class="text-3xl font-black tracking-tighter">{{ cart.finalPrice.toLocaleString() }} P</span>
            </div>
          </div>

          <button
            @click="placeOrder"
            :disabled="ordering"
            class="btn-samsung btn-samsung-black w-full py-4 uppercase tracking-widest text-sm shadow-2xl"
          >
            {{ ordering ? '처리 중...' : '🚀 임무 시작 (주문하기)' }}
          </button>
          <button @click="cart.clearCart()" class="w-full py-3 mt-3 text-[10px] font-black uppercase text-zinc-300 hover:text-red-500 transition-colors">
            창고 비우기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
