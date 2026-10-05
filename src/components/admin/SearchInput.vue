<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n/adminLanguage'

// SearchInput is the search box used in table toolbars, with the icon inside the field.
defineProps<{ placeholder?: string }>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="relative w-full min-w-48 flex-1 sm:max-w-sm">
    <SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input v-model.trim="model" class="pl-9" :placeholder="placeholder || t('common.search')" />
  </div>
</template>
