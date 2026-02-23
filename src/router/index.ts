import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            meta: { requiresAuth: true }
        },
        {
            path: '/cart',
            name: 'cart',
            component: () => import('../views/CartView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('../views/ProfileView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/missions',
            name: 'missions',
            component: () => import('../views/Missions.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/admin/products',
            name: 'admin-products',
            component: () => import('../views/AdminProducts.vue'),
            meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
            path: '/admin/orders',
            name: 'admin-orders',
            component: () => import('../views/AdminOrders.vue'),
            meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
            path: '/admin/users',
            name: 'admin-users',
            component: () => import('../views/AdminUsers.vue'),
            meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
            path: '/admin/missions',
            name: 'admin-missions',
            component: () => import('../views/AdminMissions.vue'),
            meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('../views/LoginView.vue')
        }
    ]
})

// ─── Navigation Guard ─────────────────────────────────────────
// localStorage를 직접 읽어 Pinia 종속성 없이 처리 (라우터 초기화 시점 안전성)
router.beforeEach((to, _from, next) => {
    // localStorage에서 직접 읽되, role 필드를 명확히 체크
    const token = localStorage.getItem('rocket_token')
    const userRaw = localStorage.getItem('rocket_user')

    let role: string | null = null
    if (userRaw) {
        try {
            const parsed = JSON.parse(userRaw)
            role = parsed?.role ?? null
        } catch { role = null }
    }

    if (to.meta.requiresAuth && !token) {
        return next({ name: 'login' })
    }
    if (to.meta.requiresAdmin && role !== 'admin') {
        return next({ name: 'home' })
    }
    next()
})

export default router
