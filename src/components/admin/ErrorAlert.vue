<script setup lang="ts">
import { CircleAlertIcon } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'

// ErrorAlert shows a page-level failure (a list that did not load, a save the API refused) and stays until
// the next action clears it. Short-lived confirmations use toasts instead.
defineProps<{ message: string }>()
</script>

<template>
  <Alert v-if="message" variant="destructive" class="border-destructive/30">
    <CircleAlertIcon />
    <AlertDescription>{{ message }}</AlertDescription>
  </Alert>
</template>
