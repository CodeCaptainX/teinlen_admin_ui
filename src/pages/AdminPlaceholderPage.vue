<template>
  <section class="flex min-h-[calc(100vh-6.5rem)] w-full flex-col">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div class="flex items-center gap-3">
        <div class="admin-icon-tile h-10 w-10">
          <Icon :icon="icon" class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-normal">{{ title }}</h1>
          <p class="text-sm text-slate-400">{{ subtitle }}</p>
        </div>
      </div>
    </header>

    <section class="admin-panel grid flex-1 place-items-center p-6 text-center">
      <div class="max-w-md">
        <Icon :icon="icon" class="mx-auto mb-4 h-12 w-12 text-gold" />
        <h2 class="mb-2 text-xl font-black">{{ title }}</h2>
        <p class="text-sm text-slate-400">{{ emptyText }}</p>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  // title names the admin page that has a route but is waiting for its data workflow.
  title: string
  // subtitle gives operators immediate context in the page header.
  subtitle: string
  // icon keeps placeholder pages visually aligned with the sidebar item.
  icon: string
  // emptyText explains why the page is intentionally empty today.
  emptyText: string
}>()
</script>
