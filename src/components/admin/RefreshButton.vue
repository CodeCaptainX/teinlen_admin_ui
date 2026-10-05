<script setup lang="ts">
import { RefreshCwIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n/adminLanguage'

// RefreshButton is the reload control in every page header; the icon spins while that page is loading.
defineProps<{ loading?: boolean }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <Button variant="outline" size="icon" :title="t('common.refresh')" :aria-label="t('common.refresh')" @click="$emit('click')">
    <RefreshCwIcon :class="{ 'animate-spin': loading }" />
  </Button>
</template>
