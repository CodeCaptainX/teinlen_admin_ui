<script setup lang="ts">
import type { Component } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'

// StatCard shows one headline number (rounds playing, money held, ...) with a short hint underneath.
// `highlight` draws attention when the number needs action, e.g. pending refunds above zero.
defineProps<{
  label: string
  value: string
  hint?: string
  icon?: Component
  loading?: boolean
  highlight?: boolean
}>()
</script>

<template>
  <div class="rounded-xl border bg-card p-4" :class="highlight ? 'border-warning/40' : ''">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ label }}</span>
      <component :is="icon" v-if="icon" class="size-4" :class="highlight ? 'text-warning' : 'text-muted-foreground'" />
    </div>
    <Skeleton v-if="loading" class="mt-3 h-7 w-24" />
    <p v-else class="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{{ value }}</p>
    <p v-if="hint" class="mt-1 text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>
