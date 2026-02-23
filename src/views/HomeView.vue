<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCartStore } from '../store/cart'
import { useAuthStore } from '../store/auth'
import { useCategoryStore } from '../store/category'
import { useRouter } from 'vue-router'

const cart = useCartStore()
const auth = useAuthStore()
const categoryStore = useCategoryStore()
const router = useRouter()

const products = ref<any[]>([])
const loading = ref(false)
const selectedCategory = ref('전체')
const addedId = ref('')

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/products')
    if (res.ok) products.value = await res.json()
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

const filteredProducts = computed(() => {
  if (selectedCategory.value === '전체') return products.value
  return products.value.filter(p => p.category === selectedCategory.value)
})

const handleAddToCart = (product: any) => {
  if (!auth.isAuthenticated) return router.push('/auth/login')
  cart.addItem({ _id: product._id, title: product.title, price: product.price, image: product.image, category: product.category })
  addedId.value = product._id
  setTimeout(() => addedId.value = '', 1200)
}

onMounted(fetchProducts)
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero Banner -->
    <section class="section-padding bg-zinc-50 overflow-hidden relative">
      <div class="max-w-7xl mx-auto px-6 flex flex-col items-center text-center py-20 lg:py-32">
        <h1 class="text-samsung-header mb-8">Experience <br/> <span class="text-zinc-300">New Galaxy.</span></h1>
        <p class="text-xl text-zinc-500 font-medium mb-12 max-w-2xl leading-relaxed">로켓 패밀리 함선의 대원들을 위한 최첨단 보급품과 특별한 경험을 만나보세요.</p>
        <a href="#products" class="btn-samsung btn-samsung-black px-12 py-5 text-sm uppercase tracking-widest shadow-2xl">탐사 시작하기</a>
      </div>
      <div class="absolute -bottom-20 -right-20 text-[300px] opacity-[0.03] select-none rotate-12 pointer-events-none">🚀</div>
    </section>

    <!-- Category Filters -->
    <section class="py-8 border-b border-zinc-100 sticky top-[64px] bg-white/90 backdrop-blur-xl z-30">
      <div class="max-w-7xl mx-auto px-6 overflow-x-auto">
        <div class="flex gap-3 min-w-max">
          <button v-for="cat in categoryStore.list" :key="cat"
            @click="selectedCategory = cat"
            :class="selectedCategory === cat ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'"
            class="px-7 py-2.5 rounded-full text-[10px] font-black tracking-widest transition-all">
            {{ cat }}
          </button>
        </div>
      </div>
    </section>

    <!-- Product Grid -->
    <section id="products" class="max-w-7xl mx-auto px-6 py-20">
      <div class="mb-12 flex justify-between items-end">
        <h2 class="text-3xl font-black tracking-tighter uppercase">{{ selectedCategory }} Collections</h2>
        <span class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{{ filteredProducts.length }} ITEMS</span>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div v-for="n in 4" :key="n" class="aspect-[3/4] bg-zinc-50 rounded-3xl animate-pulse"></div>
      </div>

      <!-- Products -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div v-for="product in filteredProducts" :key="product._id" class="samsung-card group flex flex-col">
          <div class="aspect-square bg-zinc-50 rounded-2xl mb-6 overflow-hidden relative">
            <img v-if="product.image" :src="product.image" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" @error="(e:any) => e.target.style.display='none'" />
            <div v-else class="w-full h-full flex items-center justify-center text-6xl">📦</div>
            <div class="absolute top-3 left-3 flex gap-1.5">
              <span class="px-2.5 py-1 bg-white/90 backdrop-blur text-[9px] font-black uppercase rounded-full shadow-sm border border-zinc-100">{{ product.category }}</span>
              <span v-if="product.stock === 0" class="px-2.5 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded-full">품절</span>
            </div>
          </div>
          <div class="flex flex-col flex-grow">
            <h3 class="text-base font-bold mb-1 tracking-tight group-hover:text-blue-700 transition-colors">{{ product.title }}</h3>
            <p class="text-zinc-400 text-xs line-clamp-2 mb-4 font-medium leading-relaxed flex-grow">{{ product.description || '·' }}</p>
            <div class="flex justify-between items-center mt-auto">
              <span class="text-xl font-black tracking-tighter">{{ product.price.toLocaleString() }} <span class="text-[10px] font-bold text-zinc-300">P</span></span>
              <button
                :disabled="product.stock === 0"
                @click="handleAddToCart(product)"
                class="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm text-xl font-black"
                :class="addedId === product._id
                  ? 'bg-green-500 text-white scale-110'
                  : product.stock === 0
                    ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                    : 'bg-zinc-100 hover:bg-black hover:text-white'"
              >
                {{ addedId === product._id ? '✓' : '+' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && filteredProducts.length === 0" class="py-40 text-center">
        <p class="text-xl font-black text-zinc-300 uppercase tracking-widest">No supplies in this sector.</p>
      </div>
    </section>
  </div>
</template>
