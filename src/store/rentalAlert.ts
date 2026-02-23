import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useRentalAlertStore = defineStore('rentalAlert', () => {
    const alerts = ref<any[]>([])
    const dismissed = ref(false)

    const setAlerts = (newAlerts: any[]) => {
        alerts.value = newAlerts
        dismissed.value = false
    }

    const dismiss = () => {
        dismissed.value = true
    }

    const hasAlerts = () => alerts.value.length > 0 && !dismissed.value

    return { alerts, dismissed, setAlerts, dismiss, hasAlerts }
})
