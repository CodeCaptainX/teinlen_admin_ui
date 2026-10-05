<script setup lang="ts">
import { Label } from '@/components/ui/label'

// FormField is a labelled form row: label on top, the control in the slot, and an optional hint below.
// It keeps every admin form spaced and labelled the same way.
defineProps<{
  label: string
  hint?: string
  // id links the label to the control for screen readers and click-to-focus.
  id?: string
}>()
</script>

<template>
  <div class="grid gap-1.5">
    <Label :for="id" class="text-xs font-medium text-muted-foreground">{{ label }}</Label>
    <slot />
    <p v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>
