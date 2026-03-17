<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  LineElement,
  PointElement,
  Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler
)

const auth = useAuthStore()
const router = useRouter()

const loading = ref(true)
const analytics = ref<any>({
    summary: { totalFloatingPoints: 0, totalRevenue30Days: 0, totalOrders30Days: 0 },
    topItems: [],
    dailyRevenue: []
})

// 차트 데이터 (반응형 상태)
const doughnutChartData = ref({ labels: [], datasets: [] as any[] })
const lineChartData = ref({ labels: [], datasets: [] as any[] })

// 차트 옵션 설정
const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { color: '#a1a1aa', font: { family: 'Pretendard', weight: 'bold' } } }
    }
}
const lineChartOptions: any = {
    ...chartOptions,
    scales: {
        y: { grid: { color: '#f4f4f5' }, border: { display: false } },
        x: { grid: { display: false }, border: { display: false } }
    },
    elements: {
        line: { tension: 0.4 }, // 곡선 부드럽게
        point: { radius: 0, hitRadius: 10, hoverRadius: 4 }
    }
}

const fetchAnalytics = async () => {
    loading.value = true
    try {
        const res = await fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${auth.token}` } })
        if (res.ok) {
            analytics.value = await res.json()
            
            // 1. 도넛 차트 (인기 상품 Top 5) 세팅
            const top5Colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#facc15'];
            doughnutChartData.value = {
                labels: analytics.value.topItems.map((i: any) => `${i.title} (${i.revenue.toLocaleString()} P)`),
                datasets: [{
                    data: analytics.value.topItems.map((i: any) => i.revenue), // 기준을 포인트 매출 볼륨으로 변경
                    backgroundColor: top5Colors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            }

            // 2. 라인 차트 (일별 매출 추이) 세팅
            lineChartData.value = {
                labels: analytics.value.dailyRevenue.map((i: any) => {
                    const d = new Date(i.date)
                    return `${d.getMonth()+1}/${d.getDate()}` // MM/DD 포맷
                }),
                datasets: [{
                    label: '일일 포인트 거래량 (P)',
                    data: analytics.value.dailyRevenue.map((i: any) => i.amount),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)', // 그라디언트 효과를 위한 배경색
                    borderWidth: 3,
                    fill: true
                }]
            }
        }
    } catch (err) { console.error('Analytics Fetch Error:', err) }
    finally { loading.value = false }
}

onMounted(() => {
    if (!auth.isAdmin) {
        router.push('/')
        return
    }
    fetchAnalytics()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 pb-24">
    <div class="max-w-7xl mx-auto px-6">
      
      <!-- Header -->
      <div class="mb-12">
        <h1 class="text-3xl font-black tracking-tighter uppercase mb-2">Intelligence <span class="text-blue-600">Dashboard</span></h1>
        <p class="text-sm font-bold text-gray-400">함선 내 전체 전리품 거래 현황과 대원들의 포인트 흐름을 감시합니다.</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="animate-pulse space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div v-for="n in 3" :key="n" class="h-32 bg-gray-200 rounded-3xl"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 h-96 bg-gray-200 rounded-3xl"></div>
            <div class="lg:col-span-1 h-96 bg-gray-200 rounded-3xl"></div>
        </div>
      </div>

      <div v-else class="space-y-8 relative z-10">
        <!-- 1. Key Metrics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                <div class="relative z-10">
                    <span class="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">최근 30일 총 거래액</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-4xl font-black text-gray-900 tracking-tighter">{{ analytics.summary.totalRevenue30Days.toLocaleString() }}</span>
                        <span class="text-lg font-bold text-blue-500">P</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                <div class="relative z-10">
                    <span class="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">함선 내 총 유통 포인트 (대원 잔고합)</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-4xl font-black text-gray-900 tracking-tighter">{{ analytics.summary.totalFloatingPoints.toLocaleString() }}</span>
                        <span class="text-lg font-bold text-purple-500">P</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-pink-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                <div class="relative z-10">
                    <span class="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">최근 30일 활성 주문 수</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-4xl font-black text-gray-900 tracking-tighter">{{ analytics.summary.totalOrders30Days }}</span>
                        <span class="text-lg font-bold text-pink-500">건</span>
                    </div>
                </div>
            </div>

        </div>

        <!-- 2. Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- 라인 차트 (매출 추이) -->
            <div class="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                <h2 class="text-sm font-black text-gray-800 tracking-tight mb-8 uppercase flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-500"></span> 일별 전리품 거래 동향 (최근 30일)
                </h2>
                <div class="h-[300px] w-full">
                    <Line v-if="lineChartData.labels.length > 0" :data="lineChartData" :options="lineChartOptions" />
                    <div v-else class="h-full flex items-center justify-center text-sm font-bold text-gray-300">
                        거래 데이터가 충분하지 않습니다.
                    </div>
                </div>
            </div>

            <!-- 도넛 차트 (인기 상품) -->
            <div class="lg:col-span-1 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
                <h2 class="text-sm font-black text-gray-800 tracking-tight mb-8 uppercase flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-purple-500"></span> 가장 인기 있는 전리품 Top 5
                </h2>
                <div class="flex-grow flex items-center justify-center h-[300px] relative">
                    <Doughnut v-if="doughnutChartData.labels.length > 0" :data="doughnutChartData" :options="chartOptions" />
                    <div v-else class="h-full flex items-center justify-center text-sm font-bold text-gray-300">
                        판매된 전리품이 없습니다.
                    </div>
                    <!-- 차트 중앙 데코레이션 텍스트 -->
                    <div v-if="doughnutChartData.labels.length > 0" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span class="text-3xl mb-4">🏆</span>
                    </div>
                </div>
            </div>

        </div>
      </div>

    </div>
  </div>
</template>
