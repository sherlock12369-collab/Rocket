import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 영문 key → 한글 표시명 매핑
const DEFAULT_CATEGORIES: Record<string, string> = {
    '전체': '전체',
    '장난감': '장난감',
    '간식': '간식',
    '쿠폰': '쿠폰',
    '체험': '체험',
}

export const useCategoryStore = defineStore('category', () => {
    const saved = localStorage.getItem('rocket_categories')
    const categories = ref<Record<string, string>>(saved ? JSON.parse(saved) : DEFAULT_CATEGORIES)

    const list = computed(() => Object.keys(categories.value))

    const addCategory = (name: string) => {
        const trimmed = name.trim()
        if (!trimmed || categories.value[trimmed]) return false
        categories.value[trimmed] = trimmed
        localStorage.setItem('rocket_categories', JSON.stringify(categories.value))
        return true
    }

    const removeCategory = (name: string) => {
        if (name === '전체') return // 전체는 삭제 불가
        delete categories.value[name]
        localStorage.setItem('rocket_categories', JSON.stringify(categories.value))
    }

    return { categories, list, addCategory, removeCategory }
})
