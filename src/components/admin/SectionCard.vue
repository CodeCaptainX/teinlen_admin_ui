<script setup lang="ts">
// SectionCard is the card for non-table content (forms, card grids, summaries): a title row with optional
// actions, then the body. Tables use DataPanel instead, which adds the scroll and height rules.
defineProps<{
  title?: string
  description?: string
  // flush removes body padding for content that draws its own edges (lists, code blocks).
  flush?: boolean
}>()
</script>

<template>
  <section class="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
    <div v-if="title || $slots.actions" class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold">{{ title }}</h2>
        <p v-if="description" class="text-xs text-muted-foreground">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <div :class="flush ? '' : 'p-4'">
      <slot />
    </div>
  </section>
</template>
