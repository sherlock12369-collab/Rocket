<script setup lang="ts">
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from './store/auth'
import { useRentalAlertStore } from './store/rentalAlert'

const auth = useAuthStore()
const rentalAlert = useRentalAlertStore()
const router = useRouter()

const handleLogout = () => {
  auth.logout()
  rentalAlert.dismiss()
  router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <nav class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2">
          <span class="text-xl">🚀</span>
          <span class="font-black text-xl tracking-tighter uppercase">Rocket</span>
        </RouterLink>

        <div class="flex items-center gap-8">
          <!-- Main Nav -->
          <div class="hidden md:flex items-center gap-6 font-bold text-sm">
            <RouterLink to="/" class="hover:text-blue-600 transition-colors">탐사</RouterLink>
            <template v-if="auth.isAuthenticated">
              <RouterLink to="/cart"    class="hover:text-blue-600 transition-colors">보급창고</RouterLink>
              <RouterLink to="/profile" class="hover:text-blue-600 transition-colors">함선일지</RouterLink>
              <RouterLink to="/missions" class="hover:text-blue-600 transition-colors">미션</RouterLink>
            </template>
          </div>

          <!-- Admin Nav (관리자 전용) -->
          <div v-if="auth.isAdmin" class="hidden md:flex items-center gap-4 text-[10px] font-black uppercase text-zinc-400">
            <RouterLink to="/admin/products" class="hover:text-black transition-colors">📦 상품</RouterLink>
            <RouterLink to="/admin/orders"   class="hover:text-black transition-colors">📋 주문</RouterLink>
            <RouterLink to="/admin/users"    class="hover:text-black transition-colors">👥 대원</RouterLink>
            <RouterLink to="/admin/missions" class="hover:text-black transition-colors">🎯 미션</RouterLink>
          </div>

          <!-- Auth Controls -->
          <div class="flex items-center gap-4">
            <RouterLink v-if="auth.isAuthenticated" to="/cart" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <span class="text-xl">🛒</span>
            </RouterLink>

            <template v-if="auth.isAuthenticated">
              <RouterLink to="/profile" class="flex items-center gap-2 group">
                <div class="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-sm group-hover:bg-zinc-200 transition-colors flex-shrink-0">
                  {{ auth.isAdmin ? '🛸' : (auth.user as any)?.membershipTier === 'star' ? '⭐' : '🚀' }}
                </div>
                <div class="flex flex-col leading-tight">
                  <span class="text-xs font-black tracking-tight">{{ auth.user?.name }}</span>
                  <span class="text-[9px] font-bold text-zinc-400 uppercase">{{ auth.isAdmin ? 'Commander' : (auth.user as any)?.membershipTier === 'star' ? 'Star Member' : 'Explorer' }}</span>
                </div>
              </RouterLink>
              <button @click="handleLogout" class="text-[10px] font-black uppercase text-zinc-400 hover:text-black transition-colors">Logout</button>
            </template>
            <template v-else>
              <RouterLink to="/auth/login" class="btn-samsung btn-samsung-black text-xs py-2 px-6">로그인</RouterLink>
            </template>
          </div>
        </div>
      </nav>
    </header>

    <!-- 대여 반납 알림 배너 -->
    <Transition name="slide-down">
      <div
        v-if="rentalAlert.alerts.length > 0 && !rentalAlert.dismissed"
        class="relative z-40"
      >
        <div
          v-for="alert in rentalAlert.alerts" :key="alert.orderId"
          :class="alert.status === 'overdue' ? 'bg-red-600' : 'bg-orange-500'"
          class="text-white px-6 py-4"
        >
          <div class="max-w-7xl mx-auto flex items-start justify-between gap-6">
            <!-- 아이콘 + 내용 -->
            <div class="flex items-start gap-3 flex-1">
              <span class="text-xl flex-shrink-0 mt-0.5">{{ alert.status === 'overdue' ? '🚨' : '⏰' }}</span>
              <div>
                <p class="font-black text-sm tracking-tight">
                  {{ alert.status === 'overdue' ? '[반납 기한 초과]' : '[반납 기한 임박]' }}
                  {{ alert.message }}
                  <span v-if="alert.status === 'overdue'" class="ml-1 text-red-200">— 현재까지 {{ alert.totalPenalty }}P 차감</span>
                  <span v-else class="ml-1 text-orange-200">— 초과 시 하루 1P 차감</span>
                </p>
                <!-- 물품 목록 -->
                <div class="flex flex-wrap gap-2 mt-1.5">
                  <span
                    v-for="item in alert.items" :key="item.title"
                    class="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 tracking-wide"
                  >
                    📦 {{ item.title }} × {{ item.quantity }}
                  </span>
                </div>
                <!-- 반납 기한 -->
                <p class="text-[10px] font-bold mt-1.5 opacity-80 uppercase tracking-widest">
                  Return Deadline: {{ alert.deadline }}
                </p>
              </div>
            </div>
            <!-- 액션 버튼 -->
            <div class="flex items-center gap-3 flex-shrink-0">
              <RouterLink to="/profile" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                지금 반납 →
              </RouterLink>
              <button @click="rentalAlert.dismiss()" class="opacity-60 hover:opacity-100 text-xl leading-none transition-opacity">✕</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <main class="flex-grow">
      <RouterView />
    </main>

    <footer class="bg-gray-50 border-t border-gray-100 py-12">
      <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">
          © 2026 Rocket Family Mall
        </p>
        <div class="flex gap-6 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
          <span v-if="auth.isAdmin" class="text-black">Commander Mode 🛡️</span>
          <span v-else-if="auth.isAuthenticated">Explorer Mode 🚀</span>
        </div>
      </div>
    </footer>
  </div>
</template>
