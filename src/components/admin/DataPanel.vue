<script setup lang="ts">
import type { Component } from 'vue'
import { InboxIcon } from '@lucide/vue'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n/adminLanguage'
import { cn } from '@/lib/utils'

// DataPanel is the card every admin table lives in: optional title row and toolbar, the scrolling table
// area, and a footer for pagination. It owns the table height rules for the whole admin:
//   - min height, so short lists and loading/empty states do not make the page jump;
//   - max height, so long lists scroll inside the card with a sticky header instead of stretching the page.
// `size="compact"` is for side-by-side tables (dashboard) that should stay short.
const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    loading?: boolean
    empty?: boolean
    emptyTitle?: string
    emptyText?: string
    emptyIcon?: Component
    size?: 'page' | 'compact'
  }>(),
  { size: 'page' },
)

// The page size subtracts the header, stats, and toolbar so the footer stays on screen at common heights.
const heightClass = props.size === 'compact' ? 'min-h-64 max-h-96' : 'min-h-80 max-h-[max(20rem,calc(100dvh-20rem))]'
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

    <div v-if="$slots.toolbar" class="flex flex-wrap items-center gap-2 border-b px-4 py-3">
      <slot name="toolbar" />
    </div>

    <!-- Scroll area: sticky, opaque header so column names stay visible while rows scroll underneath. -->
    <div
      :class="
        cn(
          'overflow-auto',
          heightClass,
          '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-muted [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:px-4 [&_td]:px-4 [&_td]:py-3',
        )
      "
    >
      <div v-if="loading" class="grid gap-3 p-4">
        <Skeleton v-for="row in 6" :key="row" class="h-9 w-full" />
      </div>
      <div v-else-if="empty" class="grid h-full min-h-[inherit] place-items-center p-6 text-center">
        <div class="grid justify-items-center gap-2">
          <component :is="emptyIcon || InboxIcon" class="size-8 text-muted-foreground/60" />
          <p class="text-sm font-medium">{{ emptyTitle || t('common.nothingHere') }}</p>
          <p v-if="emptyText" class="max-w-sm text-xs text-muted-foreground">{{ emptyText }}</p>
        </div>
      </div>
      <slot v-else />
    </div>

    <div v-if="$slots.footer" class="border-t px-4 py-3">
      <slot name="footer" />
    </div>
  </section>
</template>
