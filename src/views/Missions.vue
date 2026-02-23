<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()

const availableMissions = ref<any[]>([])
const loading = ref(false)

const fetchAvailableMissions = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/missions')
    if (res.ok) availableMissions.value = await res.json()
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

const reportingMission = ref<any>(null)
const reportContent = ref('')
const submitting = ref(false)

const openReport = (mission: any) => {
  reportingMission.value = mission
  reportContent.value = ''
}

const submitReport = async () => {
  if (!reportContent.value.trim()) return alert('증빙 내용을 입력하세요.')
  submitting.value = true
  try {
    const res = await fetch('/api/missions/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        title: reportingMission.value.title,
        proofText: reportContent.value,
        rewardPoints: reportingMission.value.rewardPoints
      })
    })
    if (res.ok) {
      alert('미션 보고가 완료되었습니다! 지휘관의 승인을 기다리세요. 🚀')
      reportingMission.value = null
    } else {
      const data = await res.json()
      alert(`오류: ${data.error || '제출 실패'}`)
    }
  } catch { alert('서버 연결 오류') }
  finally { submitting.value = false }
}

// ─── Admin Controls (Moved from AdminMissions) ───
const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const newMission = ref({ title: '', description: '', rewardPoints: 10 })

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${auth.token}`
})

const createMission = async () => {
  if (!newMission.value.title || newMission.value.rewardPoints <= 0) {
    createError.value = '제목과 보상 포인트를 입력하세요.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const res = await fetch('/api/admin/missions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newMission.value)
    })
    const data = await res.json()
    if (res.ok) {
      showCreateModal.value = false
      newMission.value = { title: '', description: '', rewardPoints: 10 }
      await fetchAvailableMissions()
    } else {
      createError.value = data.error || '실패'
    }
  } catch {
    createError.value = '서버 통신 오류'
  } finally {
    creating.value = false
  }
}

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
      fetchAvailableMissions()
    } else {
      alert(data.error || '삭제 실패')
    }
  } catch {
    alert('서버 통신 오류')
  }
}

import { onMounted } from 'vue'
onMounted(fetchAvailableMissions)
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 section-padding">
    <div class="mb-16">
      <div class="flex justify-between items-end">
        <div>
          <h1 class="text-samsung-header">Active <br/> <span class="text-zinc-400">Missions.</span></h1>
          <p class="text-lg text-zinc-500 font-medium">임무를 완수하고 로켓 함선 가동에 필요한 포인트를 보급받으세요.</p>
        </div>
        <button v-if="auth.user?.role === 'admin'" @click="showCreateModal = true" class="btn-samsung btn-samsung-black px-8 py-4 text-xs uppercase tracking-widest flex-shrink-0">
          + 미션 추가
        </button>
      </div>
    </div>

    <div v-if="loading" class="py-20 text-center opacity-50">
       <div class="inline-block w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid md:grid-cols-2 gap-8">
      <div v-for="mission in availableMissions" :key="mission._id" class="samsung-card flex flex-col justify-between group relative">
         <button v-if="auth.user?.role === 'admin'" @click="deleteMission(mission._id, mission.title)" class="absolute top-6 right-6 text-zinc-300 hover:text-red-500 transition-colors z-10">
           <span class="text-xl leading-none">✕</span>
         </button>
         
         <div>
            <div class="flex justify-between items-start mb-6">
               <span class="text-[10px] font-black uppercase tracking-widest text-zinc-400">Template Mission</span>
               <span class="text-2xl font-black text-blue-700">{{ mission.rewardPoints }} P</span>
            </div>
            <h3 class="text-xl font-bold mb-4 tracking-tight">{{ mission.title }}</h3>
            <p class="text-sm text-zinc-500 font-medium leading-relaxed mb-8">
              {{ mission.proofText || '지정된 임무를 완수하고 인증 내용을 작성하면 지휘관(부모님)의 검토 후 최종 보급이 완료됩니다.' }}
            </p>
         </div>
         <button @click="openReport(mission)" class="btn-samsung btn-samsung-outline w-full py-4 uppercase tracking-widest text-xs font-black">
           완료 보고하기
         </button>
      </div>
      
      <div v-if="availableMissions.length === 0" class="md:col-span-2 samsung-card py-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
        현재 수행 가능한 미션이 없습니다.
      </div>
    </div>

    <!-- 미션 생성 모달 (어드민 전용) -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-lg p-8">
          <div class="flex justify-between items-start mb-6">
            <h2 class="text-2xl font-black uppercase tracking-tighter">새 미션 등록</h2>
            <button @click="showCreateModal = false" class="text-zinc-400 hover:text-black text-2xl leading-none">✕</button>
          </div>
          <form @submit.prevent="createMission" class="space-y-4">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">미션 제목 *</label>
              <input v-model="newMission.title" type="text" placeholder="예) 매일 운동 인증..." class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black" required />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">설명 (수행 가이드)</label>
              <textarea v-model="newMission.description" rows="3" placeholder="대원들이 어떻게 수행해야 할지 간단히 적어주세요..." class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black resize-none"></textarea>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-zinc-400">보상 포인트 *</label>
              <input v-model.number="newMission.rewardPoints" type="number" min="1" class="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black" />
            </div>
            <div v-if="createError" class="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-2xl">{{ createError }}</div>
            <button :disabled="creating" type="submit" class="btn-samsung btn-samsung-black w-full py-4 uppercase tracking-widest text-sm">
              {{ creating ? '등록 중...' : '미션 리스트에 추가' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Report Modal (Simple Overlay) -->
    <Teleport to="body">
      <div v-if="reportingMission" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
         <div class="bg-white rounded-3xl w-full max-w-lg p-10 relative">
            <button @click="reportingMission = null" class="absolute top-6 right-6 text-2xl">✕</button>
            <h2 class="text-2xl font-black mb-2">{{ reportingMission.title }}</h2>
            <p class="text-xs text-zinc-400 font-bold uppercase mb-8">Mission Completion Report</p>
            
            <div class="space-y-6">
               <div class="space-y-2">
                  <label class="text-[10px] font-black uppercase text-zinc-400">활동 내용 (Proof of Work)</label>
                  <textarea v-model="reportContent" placeholder="어떻게 미션을 수행했는지 적어주세요..." class="w-full h-40 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-black transition-colors resize-none"></textarea>
               </div>
               <button @click="submitReport" class="btn-samsung btn-samsung-black w-full py-4 uppercase tracking-widest text-xs font-black">보고서 제출</button>
            </div>
         </div>
      </div>
    </Teleport>
  </div>
</template>
