import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('rocket_token') || '')
    const user = ref<any>(JSON.parse(localStorage.getItem('rocket_user') || 'null'))

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => user.value?.role === 'admin')

    const setAuth = (newToken: string, newUser: any) => {
        token.value = newToken
        user.value = newUser
        localStorage.setItem('rocket_token', newToken)
        localStorage.setItem('rocket_user', JSON.stringify(newUser))
    }

    const logout = () => {
        token.value = ''
        user.value = null
        localStorage.removeItem('rocket_token')
        localStorage.removeItem('rocket_user')
    }

    return { token, user, isAuthenticated, isAdmin, setAuth, logout }
})
