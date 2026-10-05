<script setup lang="ts">
import { LanguagesIcon } from '@lucide/vue'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ADMIN_LANGUAGES, t, useAdminLanguage } from '@/i18n/adminLanguage'

// LanguageSwitcher changes the admin UI language (and the language of API messages). It sits in the top
// bar and on the login screen; the choice is remembered in this browser.
const language = useAdminLanguage()
</script>

<template>
  <div class="flex items-center gap-2">
    <LanguagesIcon class="size-4 text-muted-foreground" aria-hidden="true" />
    <NativeSelect v-model="language" class="h-9 text-sm" :aria-label="t('common.language')">
      <NativeSelectOption v-for="option in ADMIN_LANGUAGES" :key="option.value" :value="option.value">{{ option.label }}</NativeSelectOption>
    </NativeSelect>
  </div>
</template>
