<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${auth.token}`
})

// ─── New User Form ─────────────────────────────────────────────
const newUser = ref({ username: '', password: '', name: '', role: 'user', initialPoints: 0 })
const registering = ref(false)
const registerMsg = ref({ text: '', ok: true })

const registerUser = async () => {
  if (!newUser.value.username || !newUser.value.password || !newUser.value.name) {
    registerMsg.value = { text: '모든 필수 항목을 입력하세요.', ok: false }
    return
  }
  registering.value = true
  registerMsg.value = { text: '', ok: true }
  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newUser.value)
    })
    const data = await res.json()
    if (res.ok) {
      registerMsg.value = { text: '대원이 등록되었습니다! 🚀', ok: true }
      newUser.value = { username: '', password: '', name: '', role: 'user', initialPoints: 0 }
      await fetchUsers()
    } else {
      registerMsg.value = { text: data.error || '등록 실패', ok: false }
    }
  } catch {
    registerMsg.value = { text: '서버 통신 오류', ok: false }
  } finally {
    registering.value = false
  }
}

// ─── User List ────────────────────────────────────────────────
const users = ref<any[]>([])
const fetchUsers = async () => {
  try {
    const res = await fetch('/api/admin/users', { headers: getAuthHeaders() })
    if (res.ok) users.value = await res.json()
  } catch (err) { console.error(err) }
}

const givePoints = async (userId: string, amount: number) => {
  try {
    const res = await fetch(`/api/admin/users/${userId}/points`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount })
    })
    if (res.ok) await fetchUsers()
    else alert('포인트 변경 실패')
  } catch { alert('서버 오류') }
}

const deleteUser = async (userId: string, userName: string) => {
  if (!confirm(`'${userName}' 대원을 함선에서 하선(삭제)시키겠습니까?`)) return
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message)
      await fetchUsers()
    } else {
      alert(data.error || '삭제 실패')
    }
  } catch {
    alert('서버 통신 오류')
  }
}

// ─── Edit User ────────────────────────────────────────────────
const showEditModal = ref(false)
const editingUser = ref<any>(null)
const editForm = ref({ username: '', password: '', name: '', role: 'user', membershipTier: 'normal' })
const isSaving = ref(false)

const openEditModal = (user: any) => {
  editingUser.value = user
  editForm.value = {
    username: user.username,
    password: '', // 보안상 비워둠
    name: user.name,
    role: user.role,
    membershipTier: user.membershipTier || 'normal'
  }
  showEditModal.value = true
}

const saveUserEdit = async () => {
  if (!editingUser.value) return
  isSaving.value = true
  try {
    const res = await fetch(`/api/admin/users/${editingUser.value._id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(editForm.value)
    })
    const data = await res.json()
    if (res.ok) {
      alert('대원 정보가 수정되었습니다.')
      showEditModal.value = false
      await fetchUsers()
    } else {
      alert(data.error || '수정 실패')
    }
  } catch {
    alert('서버 통신 오류')
  } finally {
    isSaving.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 section-padding">
    <div class="mb-12">
      <h1 class="text-samsung-header">Manage <br/><span class="text-zinc-400">Members.</span></h1>
      <p class="text-lg text-zinc-500 font-medium">함선 대원을 등록하고 보급 포인트를 관리하세요.</p>
    </div>

    <div class="grid lg:grid-cols-2 gap-12">
      <!-- ─ Registration Form ─ -->
      <div class="samsung-card h-fit">
        <h2 class="text-xl font-black mb-8 border-b border-zinc-100 pb-4 uppercase tracking-tighter">신규 대원 등록</h2>
        <form @submit.prevent="registerUser" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">대원 이름 *</label>
              <input v-model="newUser.name" type="text" placeholder="김우주" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" required />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">아이디 *</label>
              <input v-model="newUser.username" type="text" placeholder="kimwoojoo" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" required />
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-zinc-400">비밀번호 *</label>
            <input v-model="newUser.password" type="password" placeholder="••••••••" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">역할</label>
              <select v-model="newUser.role" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors">
                <option value="user">Explorer (일반)</option>
                <option value="admin">Commander (관리자)</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">초기 포인트</label>
              <input v-model.number="newUser.initialPoints" type="number" min="0" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors" />
            </div>
          </div>

          <div v-if="registerMsg.text" class="p-3 rounded-2xl text-xs font-bold text-center" :class="registerMsg.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
            {{ registerMsg.text }}
          </div>

          <button :disabled="registering" type="submit" class="btn-samsung btn-samsung-black w-full py-4 uppercase tracking-widest text-sm">
            {{ registering ? '등록 처리 중...' : '대원 등록 완료' }}
          </button>
        </form>
      </div>

      <!-- ─ User List ─ -->
      <div class="space-y-4">
        <h2 class="text-xl font-black uppercase tracking-tighter">탑승 대원 목록 ({{ users.length }})</h2>
        <div v-for="user in users" :key="user._id" class="samsung-card flex justify-between items-center !p-5 group">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-black text-lg">{{ user.name }}</span>
              <span class="text-[9px] px-2 py-0.5 rounded-full font-black uppercase" :class="user.role === 'admin' ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400'">{{ user.role }}</span>
            </div>
            <div class="text-[10px] text-zinc-400 font-bold uppercase mt-0.5 flex flex-wrap gap-x-4">
              <span>ID: @{{ user.username }}</span>
              <span class="text-zinc-300">PW: {{ user.plainPassword || '(Encrypted Hash)' }}</span>
            </div>
            <div class="mt-2 text-xl font-black">{{ user.pointBalance.toLocaleString() }}<span class="text-xs text-zinc-300 ml-1">P</span></div>
          </div>
          <div class="flex flex-col gap-2 items-end">
            <div class="flex gap-1.5 flex-wrap justify-end">
              <button @click="givePoints(user._id, 100)"  class="h-9 px-3 rounded-full bg-black text-white text-xs font-black hover:bg-zinc-700 transition-all">+100</button>
              <button @click="givePoints(user._id, 10)"   class="h-9 px-3 rounded-full border border-zinc-200 hover:bg-black hover:text-white hover:border-black transition-all text-xs font-black">+10</button>
              <button @click="givePoints(user._id, 5)"    class="h-9 px-3 rounded-full border border-zinc-200 hover:bg-black hover:text-white hover:border-black transition-all text-xs font-black">+5</button>
              <button @click="givePoints(user._id, 1)"    class="h-9 px-3 rounded-full border border-zinc-200 hover:bg-black hover:text-white hover:border-black transition-all text-xs font-black">+1</button>
            </div>
            <div class="flex gap-1.5 flex-wrap justify-end">
              <button @click="givePoints(user._id, -100)" class="h-9 px-3 rounded-full bg-red-500 text-white text-xs font-black hover:bg-red-700 transition-all">-100</button>
              <button @click="givePoints(user._id, -10)"  class="h-9 px-3 rounded-full border border-red-200 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-xs font-black">-10</button>
              <button @click="givePoints(user._id, -5)"   class="h-9 px-3 rounded-full border border-red-200 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-xs font-black">-5</button>
              <button @click="givePoints(user._id, -1)"   class="h-9 px-3 rounded-full border border-red-200 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-xs font-black">-1</button>
            </div>
            <!-- 수동 포인트 하사 -->
            <div class="flex gap-2 mt-1">
              <input 
                type="number" 
                placeholder="금액" 
                class="w-20 px-3 h-9 bg-zinc-50 border border-zinc-100 rounded-full text-[10px] font-black focus:outline-none focus:border-black"
                @keyup.enter="(e: any) => { if(e.target.value) { givePoints(user._id, Number(e.target.value)); e.target.value = ''; } }"
              />
              <button 
                @click="(e: any) => { 
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement); 
                  if(input.value) { givePoints(user._id, Number(input.value)); input.value = ''; } 
                }"
                class="h-9 px-4 rounded-full bg-blue-600 text-white text-[10px] font-black hover:bg-blue-800 transition-all"
              >
                하사 (Manual)
              </button>
            </div>
            <!-- 수정/삭제 버튼 -->
            <div class="flex gap-3 mt-1">
              <button @click="openEditModal(user)" class="text-[10px] font-black uppercase text-zinc-400 hover:text-black transition-colors">정보 수정</button>
              <button @click="deleteUser(user._id, user.name)" class="text-[10px] font-black uppercase text-zinc-300 hover:text-red-500 transition-colors">대원 삭제</button>
            </div>
          </div>
        </div>
        <div v-if="users.length === 0" class="samsung-card py-16 text-center text-zinc-300 border-dashed border-2">
          <p class="text-3xl mb-2">📡</p>
          <p class="text-[10px] font-black uppercase">등록된 대원이 없습니다</p>
        </div>
      </div>
    </div>

    <!-- ─ Edit User Modal ─ -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
          <div class="flex justify-between items-start mb-8">
            <div>
              <h2 class="text-2xl font-black uppercase tracking-tighter">대원 정보 수정</h2>
              <p class="text-[10px] font-bold text-zinc-400 mt-1 uppercase">Crew Member Configuration</p>
            </div>
            <button @click="showEditModal = false" class="text-zinc-400 hover:text-black text-2xl leading-none">✕</button>
          </div>

          <form @submit.prevent="saveUserEdit" class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">대원 이름</label>
                <input v-model="editForm.name" type="text" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black" required />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">아이디 (Username)</label>
                <input v-model="editForm.username" type="text" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black" required />
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">비밀번호 (변경 시만 입력)</label>
              <input v-model="editForm.password" type="password" placeholder="••••••••" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black" />
              <p class="text-[9px] text-zinc-400 font-bold ml-1">변경하지 않으려면 비워두세요. (평문으로도 저장됩니다.)</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">역할 (Role)</label>
                <select v-model="editForm.role" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black">
                  <option value="user">Explorer (일반)</option>
                  <option value="admin">Commander (관리자)</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase text-zinc-400">멤버십 (Tier)</label>
                <select v-model="editForm.membershipTier" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black">
                  <option value="normal">Normal</option>
                  <option value="star">Star Member ⭐</option>
                </select>
              </div>
            </div>

            <div class="flex gap-3 pt-6 border-t border-zinc-50">
              <button type="button" @click="showEditModal = false" class="flex-grow py-4 text-[10px] font-black uppercase text-zinc-400 hover:text-black transition-colors">취소</button>
              <button :disabled="isSaving" type="submit" class="btn-samsung btn-samsung-black flex-[2] py-4 uppercase tracking-widest text-sm shadow-xl">
                {{ isSaving ? '저장 중...' : '정보 업데이트 완료' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
