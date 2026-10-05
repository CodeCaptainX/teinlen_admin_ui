<script setup lang="ts">
// PageHeader is the title row every admin page starts with: what this page is for, plus its main actions
// (refresh, create, ...) on the right. The `leading` slot holds a back button on detail pages.
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex min-w-0 items-center gap-3">
      <slot name="leading" />
      <div class="min-w-0">
        <h1 class="truncate text-xl font-semibold tracking-tight">{{ title }}</h1>
        <p v-if="description" class="mt-0.5 text-sm text-muted-foreground">{{ description }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
