<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import type { StatusTone, StatusView } from '@/lib/status'

// StatusBadge renders one domain state (round, bet, refund, suspension) with the shared tone colors.
// Pass a `view` from lib/status.ts so the label and color always match the state's meaning.
const props = defineProps<{
  view: StatusView
  // pulse marks live states (for example a round being played) with a breathing dot.
  pulse?: boolean
}>()

// toneClasses keeps badge colors in one place; tints stay subtle so dense tables remain readable.
const toneClasses: Record<StatusTone, string> = {
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  info: 'border-info/25 bg-info/10 text-info',
  danger: 'border-destructive/25 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-muted text-muted-foreground',
}

const classes = computed(() =>
  cn('inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', toneClasses[props.view.tone]),
)
</script>

<template>
  <span :class="classes">
    <span v-if="pulse" class="size-1.5 animate-pulse rounded-full bg-current" />
    {{ view.label }}
  </span>
</template>
