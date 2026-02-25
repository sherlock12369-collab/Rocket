import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export interface CartItem {
    _id: string
    title: string
    price: number
    image?: string
    category?: string
    type?: string  // 'buy' | 'rent'
    quantity: number
}

export const useCartStore = defineStore('cart', () => {
    const items = ref<CartItem[]>(JSON.parse(localStorage.getItem('rocket_cart') || '[]'))

    const saveCart = () => {
        localStorage.setItem('rocket_cart', JSON.stringify(items.value))
    }

    const totalCount = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
    const totalPrice = computed(() => items.value.reduce((sum, i) => sum + i.price * i.quantity, 0))
    const totalQty = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
    // Star 회원: 배송비 무료 + 5개 이상 50% 할인
    const auth = useAuthStore()
    const isStar = computed(() => (auth.user as any)?.membershipTier === 'star')
    const starDiscount = computed(() => (isStar.value && totalQty.value >= 5) ? Math.floor(totalPrice.value * 0.5) : 0)
    const discountedPrice = computed(() => totalPrice.value - starDiscount.value)

    const FREE_SHIPPING_THRESHOLD = 1000 // 1000P 이상 무료배송
    const isFreeShipping = computed(() => isStar.value || discountedPrice.value >= FREE_SHIPPING_THRESHOLD)
    const remainingForFree = computed(() => Math.max(0, FREE_SHIPPING_THRESHOLD - discountedPrice.value))

    const shippingFee = computed(() => {
        if (items.value.length === 0) return 0
        return isFreeShipping.value ? 0 : 50
    })
    const finalPrice = computed(() => discountedPrice.value + shippingFee.value)

    const addItem = (product: Omit<CartItem, 'quantity'>) => {
        const existing = items.value.find(i => i._id === product._id)
        if (existing) {
            existing.quantity++
        } else {
            items.value.push({ ...product, quantity: 1 })
        }
        saveCart()
    }

    const increaseQty = (id: string) => {
        const item = items.value.find(i => i._id === id)
        if (item) { item.quantity++; saveCart() }
    }

    const decreaseQty = (id: string) => {
        const item = items.value.find(i => i._id === id)
        if (item) {
            if (item.quantity <= 1) removeItem(id)
            else { item.quantity--; saveCart() }
        }
    }

    const removeItem = (id: string) => {
        items.value = items.value.filter(i => i._id !== id)
        saveCart()
    }

    const clearCart = () => {
        items.value = []
        saveCart()
    }

    return {
        items, totalCount, totalPrice, totalQty, starDiscount, discountedPrice,
        shippingFee, finalPrice, isStar, isFreeShipping, remainingForFree, FREE_SHIPPING_THRESHOLD,
        addItem, increaseQty, decreaseQty, removeItem, clearCart
    }
})
