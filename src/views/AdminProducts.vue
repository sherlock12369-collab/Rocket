<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { useCategoryStore } from '../store/category'

const auth = useAuthStore()
const categoryStore = useCategoryStore()
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${auth.token}`
})

// ─── Category Management ──────────────────────────────────────
const newCategoryName = ref('')
const addCategory = () => {
  if (!categoryStore.addCategory(newCategoryName.value)) {
    alert('이미 존재하거나 빈 카테고리명입니다.')
    return
  }
  newCategoryName.value = ''
}

// ─── Product List ─────────────────────────────────────────────
const products = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/products')
    if (res.ok) products.value = await res.json()
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

const deleteProduct = async (id: string) => {
  if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) return
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
    if (res.ok) await fetchProducts()
    else alert('삭제 실패')
  } catch { alert('서버 오류') }
}

// ─── Edit Product ──────────────────────────────────────────────
const showEditModal = ref(false)
const editTarget = ref<any>(null)
const editPreview = ref('')
const editError = ref('')
const saving = ref(false)

const openEdit = (item: any) => {
  editTarget.value = { ...item }  // 복사본으로 수정
  editPreview.value = item.image || ''
  editError.value = ''
  showEditModal.value = true
}

const handleEditFileUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onloadend = () => {
    const result = reader.result as string
    editTarget.value.image = result
    editPreview.value = result
  }
  reader.readAsDataURL(file)
}

const saveEdit = async () => {
  if (!editTarget.value.title || editTarget.value.price <= 0) {
    editError.value = '상품명과 가격(1P 이상)을 입력하세요.'
    return
  }
  saving.value = true
  editError.value = ''
  try {
    const res = await fetch(`/api/products/${editTarget.value._id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(editTarget.value)
    })
    const data = await res.json()
    if (res.ok) {
      showEditModal.value = false
      await fetchProducts()
    } else {
      editError.value = data.error || '수정 실패'
    }
  } catch {
    editError.value = '서버 통신 오류'
  } finally {
    saving.value = false
  }
}

const quickAddStock = async (item: any) => {
  try {
    const res = await fetch(`/api/products/${item._id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: item.title,
        description: item.description,
        price: item.price,
        category: item.category,
        stock: item.stock + 10,
        type: item.type,
        image: item.image
      })
    })
    if (res.ok) {
      await fetchProducts()
    } else {
      alert('재고 충전 실패')
    }
  } catch {
    alert('서버 통신 오류')
  }
}

// ─── New Product Form ─────────────────────────────────────────
const newProduct = ref({
  title: '', description: '', price: 0, category: 'Toy', stock: 1, type: 'buy', image: ''
})
const adding = ref(false)
const addError = ref('')
const previewImage = ref('')

const handleFileUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onloadend = () => {
    const result = reader.result as string
    newProduct.value.image = result
    previewImage.value = result
  }
  reader.readAsDataURL(file)
}

const handleUrlInput = () => {
  previewImage.value = newProduct.value.image
}

const addProduct = async () => {
  if (!newProduct.value.title || newProduct.value.price <= 0) {
    addError.value = '상품명과 가격(1P 이상)을 입력하세요.'
    return
  }
  adding.value = true
  addError.value = ''
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newProduct.value)
    })
    const data = await res.json()
    if (res.ok) {
      showModal.value = false
      newProduct.value = { title: '', description: '', price: 0, category: categoryStore.list[1] ?? '장난감', stock: 1, type: 'buy', image: '' }
      previewImage.value = ''
      await fetchProducts()
    } else {
      addError.value = data.error || '등록 실패'
    }
  } catch {
    addError.value = '서버 통신 오류'
  } finally {
    adding.value = false
  }
}

onMounted(fetchProducts)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 section-padding">
    <div class="mb-12 flex justify-between items-end">
      <div>
        <h1 class="text-samsung-header">Product <br/><span class="text-zinc-400">Inventory.</span></h1>
        <p class="text-lg text-zinc-500 font-medium">보급품을 등록하고 재고를 관리하세요.</p>
      </div>
      <button @click="showModal = true" class="btn-samsung btn-samsung-black py-4 px-10 uppercase tracking-widest text-sm shadow-xl">+ 신규 등록</button>
    </div>

    <div v-if="loading" class="py-20 text-center opacity-40">
      <div class="inline-block w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
    </div>

    <div v-else class="samsung-card overflow-hidden !p-0">
      <!-- ─ Category Manager Bar ─ -->
      <div class="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center gap-3 flex-wrap">
        <span class="text-[10px] font-black uppercase text-zinc-400 tracking-widest mr-2">카테고리 관리:</span>
        <span v-for="cat in categoryStore.list" :key="cat"
          class="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-white border border-zinc-200">
          {{ cat }}
          <button v-if="cat !== '전체'" @click="categoryStore.removeCategory(cat)" class="text-zinc-300 hover:text-red-500 transition-colors leading-none">✕</button>
        </span>
        <div class="flex items-center gap-2 ml-auto">
          <input v-model="newCategoryName" @keyup.enter="addCategory" type="text" placeholder="새 카테고리명" class="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-xs focus:outline-none focus:border-black" />
          <button @click="addCategory" class="px-4 py-1.5 bg-black text-white rounded-full text-[10px] font-black uppercase hover:bg-zinc-700 transition-colors">+ 추가</button>
        </div>
      </div>
      <table class="w-full text-left border-collapse">
        <thead class="bg-zinc-50 border-b border-zinc-100">
          <tr>
            <th class="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Image</th>
            <th class="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Product</th>
            <th class="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Type</th>
            <th class="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Category</th>
            <th class="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Price</th>
            <th class="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Stock</th>
            <th class="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in products" :key="item._id" class="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
            <td class="px-6 py-4">
              <div class="w-12 h-12 bg-zinc-100 rounded-xl overflow-hidden flex items-center justify-center text-xl">
                <img v-if="item.image" :src="item.image" class="w-full h-full object-cover" @error="(e:any) => e.target.style.display='none'" />
                <span v-else>📦</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="font-bold">{{ item.title }}</div>
              <div v-if="item.description" class="text-xs text-zinc-400 truncate max-w-[200px]">{{ item.description }}</div>
            </td>
            <td class="px-6 py-4">
              <span
                :class="item.type === 'rent'
                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200'"
                class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest"
              >
                {{ item.type === 'rent' ? '🔄 대여' : '🛒 구매' }}
              </span>
            </td>
            <td class="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">{{ item.category }}</td>
            <td class="px-6 py-4 font-black">{{ item.price }} P</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <span :class="item.stock > 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'" class="text-[10px] font-black uppercase px-2 py-1 rounded-full">
                  {{ item.stock > 0 ? item.stock + ' 재고' : '품절' }}
                </span>
                <button v-if="item.stock <= 0" @click="quickAddStock(item)" class="text-[10px] font-black text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-full transition-colors uppercase">
                  +10 충전
                </button>
              </div>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end items-center gap-3">
                <button @click="openEdit(item)" class="text-[10px] font-black uppercase text-zinc-400 hover:text-black transition-colors">수정</button>
                <button @click="deleteProduct(item._id)" class="text-[10px] font-black uppercase text-zinc-300 hover:text-red-500 transition-colors">삭제</button>
              </div>
            </td>
          </tr>
          <tr v-if="products.length === 0">
            <td colspan="7" class="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase">등록된 상품이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ─ Add Product Modal ─ -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8">
          <div class="flex justify-between items-start mb-8">
            <h2 class="text-2xl font-black uppercase tracking-tighter">보급품 신규 등록</h2>
            <button @click="showModal = false" class="text-zinc-400 hover:text-black text-2xl leading-none">✕</button>
          </div>

          <form @submit.prevent="addProduct" class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">상품명 *</label>
                <input v-model="newProduct.title" type="text" placeholder="우주 스낵 세트" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" required />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">카테고리</label>
                <select v-model="newProduct.category" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors">
                  <option v-for="cat in categoryStore.list.filter(c => c !== '전체')" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">설명 (선택)</label>
              <textarea v-model="newProduct.description" rows="2" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors resize-none"></textarea>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">가격 (P) *</label>
                <input v-model.number="newProduct.price" type="number" min="1" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">재고</label>
                <input v-model.number="newProduct.stock" type="number" min="0" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">유형</label>
                <select v-model="newProduct.type" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors">
                  <option value="buy">구매</option>
                  <option value="rent">대여</option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase text-zinc-400">이미지</label>
              <div class="flex gap-3">
                <input v-model="newProduct.image" @input="handleUrlInput" type="text" placeholder="https://이미지 URL 입력..." class="flex-grow px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors text-sm" />
                <label class="flex-shrink-0 cursor-pointer px-5 py-3 bg-zinc-100 hover:bg-zinc-200 rounded-2xl text-xs font-black uppercase flex items-center gap-1 transition-colors">
                  📁 파일
                  <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
                </label>
              </div>
              <div v-if="previewImage" class="w-full aspect-video bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100">
                <img :src="previewImage" class="w-full h-full object-contain" @error="previewImage = ''" />
              </div>
            </div>

            <div v-if="addError" class="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-2xl">{{ addError }}</div>

            <button :disabled="adding" type="submit" class="btn-samsung btn-samsung-black w-full py-4 uppercase tracking-widest text-sm">
              {{ adding ? '등록 중...' : '기지로 전송 (등록)' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ─ Edit Product Modal ─ -->
    <Teleport to="body">
      <div v-if="showEditModal && editTarget" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8">
          <div class="flex justify-between items-start mb-8">
            <h2 class="text-2xl font-black uppercase tracking-tighter">보급품 수정</h2>
            <button @click="showEditModal = false" class="text-zinc-400 hover:text-black text-2xl leading-none">✕</button>
          </div>

          <form @submit.prevent="saveEdit" class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">상품명 *</label>
                <input v-model="editTarget.title" type="text" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" required />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">카테고리</label>
                <select v-model="editTarget.category" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors">
                  <option v-for="cat in categoryStore.list.filter(c => c !== '전체')" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">설명 (선택)</label>
              <textarea v-model="editTarget.description" rows="2" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors resize-none"></textarea>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">가격 (P) *</label>
                <input v-model.number="editTarget.price" type="number" min="1" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">재고</label>
                <input v-model.number="editTarget.stock" type="number" min="0" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">유형</label>
                <select v-model="editTarget.type" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors">
                  <option value="buy">🛒 구매</option>
                  <option value="rent">🔄 대여</option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase text-zinc-400">이미지</label>
              <div class="flex gap-3">
                <input v-model="editTarget.image" @input="editPreview = editTarget.image" type="text" placeholder="https://이미지 URL 입력..." class="flex-grow px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors text-sm" />
                <label class="flex-shrink-0 cursor-pointer px-5 py-3 bg-zinc-100 hover:bg-zinc-200 rounded-2xl text-xs font-black uppercase flex items-center gap-1 transition-colors">
                  📁 파일
                  <input type="file" accept="image/*" class="hidden" @change="handleEditFileUpload" />
                </label>
              </div>
              <div v-if="editPreview" class="w-full aspect-video bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100">
                <img :src="editPreview" class="w-full h-full object-contain" @error="editPreview = ''" />
              </div>
            </div>

            <div v-if="editError" class="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-2xl">{{ editError }}</div>

            <button :disabled="saving" type="submit" class="btn-samsung btn-samsung-black w-full py-4 uppercase tracking-widest text-sm">
              {{ saving ? '저장 중...' : '변경 사항 저장' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
