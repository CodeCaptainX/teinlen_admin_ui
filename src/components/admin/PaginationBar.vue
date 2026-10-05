<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { localeTag, t } from '@/i18n/adminLanguage'

// PaginationBar is the footer of every paged table: "Showing 21–40 of 1,234 rounds", rows per page, and
// previous/next. Page and page size are v-models so the page keeps owning when to reload.
const props = defineProps<{
  total: number
  // itemLabel names what is being paged, already translated, e.g. t('items.rounds').
  itemLabel?: string
  // hidePerPage removes the page-size picker for small fixed-size lists.
  hidePerPage?: boolean
}>()
const page = defineModel<number>('page', { required: true })
const perPage = defineModel<number>('perPage', { default: 20 })

// PAGE_SIZES matches the backend cap of 100 rows per request.
const PAGE_SIZES = [10, 20, 50, 100]

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / perPage.value)))
const rangeLabel = computed(() => {
  const items = props.itemLabel || t('items.records')
  if (props.total === 0) return t('pagination.none', { items })
  const locale = localeTag()
  const first = (page.value - 1) * perPage.value + 1
  const last = Math.min(props.total, page.value * perPage.value)
  return t('pagination.showing', {
    first: first.toLocaleString(locale),
    last: last.toLocaleString(locale),
    total: props.total.toLocaleString(locale),
    items,
  })
})

// perPageChoice returns to page 1 when the size changes so the admin never lands on a page that no longer exists.
const perPageChoice = computed({
  get: () => perPage.value,
  set: (value: unknown) => {
    perPage.value = Number(value)
    page.value = 1
  },
})
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
    <span class="tabular-nums">{{ rangeLabel }}</span>
    <div class="flex items-center gap-2">
      <NativeSelect v-if="!hidePerPage" v-model="perPageChoice" class="h-8 text-xs" :aria-label="t('pagination.rowsPerPage')">
        <NativeSelectOption v-for="size in PAGE_SIZES" :key="size" :value="size">{{ t('pagination.perPage', { size }) }}</NativeSelectOption>
      </NativeSelect>
      <span class="tabular-nums">{{ t('pagination.page', { page, pages: totalPages }) }}</span>
      <Button variant="outline" size="icon-sm" :disabled="page <= 1" :aria-label="t('pagination.previous')" @click="page--">
        <ChevronLeftIcon />
      </Button>
      <Button variant="outline" size="icon-sm" :disabled="page >= totalPages" :aria-label="t('pagination.next')" @click="page++">
        <ChevronRightIcon />
      </Button>
    </div>
  </div>
</template>
