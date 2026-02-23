<script setup lang="ts">
import { ref, onMounted } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref<'success' | 'error' | 'info'>('info')

// This is a simple standalone version for demo,
// effectively it should be driven by a Pinia store.
const show = (msg: string, t: typeof type.value = 'success') => {
  message.value = msg
  type.value = t
  visible.value = true
  setTimeout(() => visible.value = false, 3000)
}

defineExpose({ show })
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] min-w-[320px]">
      <div class="bg-black text-white px-8 py-4 rounded-full shadow-2xl flex items-center justify-between gap-4 border border-white/10 backdrop-blur-xl">
        <span class="text-xs font-black uppercase tracking-widest">{{ message }}</span>
        <span v-if="type === 'success'" class="text-green-400">✓</span>
        <span v-if="type === 'error'" class="text-red-400">✕</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active {
  transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 40px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.95);
}
</style>
