<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-sm">
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <article v-if="latestToast" :key="latestToast.id" class="admin-toast" :class="toastClass(latestToast.kind)">
        <Icon :icon="toastIcon(latestToast.kind)" class="mt-0.5 h-5 w-5 shrink-0" :class="iconClass(latestToast.kind)" />
        <div class="min-w-0 flex-1">
          <strong class="block font-black">{{ latestToast.title }}</strong>
          <p v-if="latestToast.message" class="mt-1 text-slate-400">{{ latestToast.message }}</p>
        </div>
        <button class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-100" title="Dismiss" @click="$emit('dismiss', latestToast.id)">
          <Icon icon="mdi:close" class="h-4 w-4" />
        </button>
      </article>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

// ToastKind limits notification styling to variants supported by the admin theme.
export type ToastKind = 'success' | 'error' | 'info'

// ToastMessage is the shell-owned notification payload rendered by the global toast bar.
export interface ToastMessage {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

const props = defineProps<{
  // The parent owns toast lifetime so messages can be created from login, auth, and page events.
  toasts: ToastMessage[]
}>()

defineEmits<{
  // Dismiss tells the shell which toast to remove without mutating props inside this component.
  dismiss: [id: number]
}>()

// latestToast prevents stacked notifications from pushing each other around the screen.
const latestToast = computed(() => props.toasts[props.toasts.length - 1] ?? null)

// toastClass maps toast variants to global theme classes for consistent border treatment.
const toastClass = (kind: ToastKind): string => {
  if (kind === 'success') return 'admin-toast-success'
  if (kind === 'error') return 'admin-toast-error'
  return 'admin-toast-info'
}

// toastIcon chooses familiar icons so toast meaning is scannable before reading the message.
const toastIcon = (kind: ToastKind): string => {
  if (kind === 'success') return 'mdi:check-circle'
  if (kind === 'error') return 'mdi:alert-circle'
  return 'mdi:information'
}

// iconClass keeps icon color aligned with each toast variant.
const iconClass = (kind: ToastKind): string => {
  if (kind === 'success') return 'text-emerald-300'
  if (kind === 'error') return 'text-coral'
  return 'text-gold'
}
</script>
