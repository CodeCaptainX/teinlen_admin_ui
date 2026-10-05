<script setup lang="ts">
import { computed } from 'vue'
import type { GameRecordCard } from '@/api/adminApi'

// PlayingCard shows one stored card as a small chip, red for hearts/diamonds. Snapshots store either full
// card objects or compact strings like "2H" (older rows), so both are accepted.
const props = defineProps<{
  card: GameRecordCard | string
  size?: 'sm' | 'md'
}>()

// label prefers the stored display label, then rank+suit, then the card id.
const label = computed(() => {
  const card = props.card
  if (typeof card === 'string') return card
  if (card.label || card.code || card.card || card.value) return card.label || card.code || card.card || card.value || ''
  if (card.rank || card.suit) return `${card.rank || '?'}${card.suit || ''}`
  return card.id ? `#${card.id}` : '?'
})

// isRed checks the suit letter at the end of the label (D = diamonds, H = hearts).
const isRed = computed(() => {
  const card = props.card
  const suit = typeof card === 'string' ? card : card.suit || label.value
  return suit.endsWith('D') || suit.endsWith('H')
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-md border bg-muted font-mono font-semibold"
    :class="[size === 'md' ? 'px-2.5 py-1.5 text-sm' : 'px-2 py-0.5 text-xs', isRed ? 'text-destructive' : 'text-foreground']"
  >
    {{ label }}
  </span>
</template>
