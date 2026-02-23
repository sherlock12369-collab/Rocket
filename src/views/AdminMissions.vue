<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${auth.token}`
})

const missions = ref<any[]>([])
const loading = ref(false)

const fetchMissions = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/admin/missions', { headers: getAuthHeaders() })
    if (res.ok) missions.value = await res.json()
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

const updateStatus = async (id: string, status: string) => {
  try {
    const res = await fetch(`/api/admin/missions/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    })
    if (res.ok) fetchMissions()
  } catch { alert('통신 오류') }
}

// 미션 삭제 기능을 유지할지 여부: 
// 사용자 제출 리포트를 삭제하고 싶을 수도 있으므로 deleteMission 함수는 유지하되, 
// 템플릿에서 '미션 생성' 버튼만 제거합니다.
const deleteMission = async (id: string, title: string) => {
  if (!confirm(`'${title}' 미션을 삭제하시겠습니까?`)) return
  try {
    const res = await fetch(`/api/admin/missions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message)
      fetchMissions()
    } else {
      alert(data.error || '삭제 실패')
    }
  } catch {
    alert('서버 통신 오류')
  }
}

onMounted(fetchMissions)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 section-padding">
    <div class="mb-12">
      <div class="flex justify-between items-end">
        <div>
          <h1 class="text-samsung-header">Mission <br/> <span class="text-zinc-400">Validation.</span></h1>
          <p class="text-lg text-zinc-500 font-medium">대원들의 활동 보고서를 검토하고 포인트 보급을 최종 승인하세요.</p>
        </div>
      </div>
    </div>


    <div v-if="loading" class="py-20 text-center opacity-50">
       <div class="inline-block w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid lg:grid-cols-2 gap-8">
       <div v-for="m in missions" :key="m._id" class="samsung-card flex flex-col justify-between group">
          <div>
             <div class="flex justify-between items-start mb-6">
                <div class="flex items-center gap-3">
                  <span class="px-3 py-1 bg-zinc-100 rounded-full text-[9px] font-black uppercase text-zinc-500">
                    {{ m.status }}
                  </span>
                  <button @click="deleteMission(m._id, m.title)" class="text-zinc-300 hover:text-red-500 transition-colors">
                    <span class="text-xs">✕</span>
                  </button>
                </div>
                <span class="text-2xl font-black text-blue-700">+{{ m.rewardPoints }} P</span>
             </div>
             <h3 class="text-xl font-bold mb-2 tracking-tight">{{ m.title }}</h3>
             <p class="text-[10px] font-black uppercase text-zinc-400 mb-6">Requested by {{ m.userId?.name || 'Unknown' }}</p>
             
             <div class="p-4 bg-zinc-50 rounded-2xl mb-8 border border-zinc-100">
                <p class="text-sm text-zinc-600 font-medium leading-relaxed italic">"{{ m.proofText }}"</p>
             </div>
          </div>
          
          <div v-if="m.status === 'pending'" class="flex gap-4">
             <button @click="updateStatus(m._id, 'approved')" class="btn-samsung btn-samsung-black flex-grow py-4 uppercase tracking-widest text-[10px] shadow-lg">승인 (Reward Point)</button>
             <button @click="updateStatus(m._id, 'rejected')" class="flex-grow py-4 uppercase tracking-widest text-[10px] font-black text-zinc-300 hover:text-red-500 transition-colors">반려</button>
          </div>
          <div v-else class="text-xs font-bold text-zinc-300 uppercase tracking-widest italic pt-4 border-t border-zinc-50">
             Mission {{ m.status }}
          </div>
       </div>
       
       <div v-if="missions.length === 0" class="lg:col-span-2 samsung-card py-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
          검토할 미션이 없습니다.
       </div>
    </div>
  </div>
</template>
