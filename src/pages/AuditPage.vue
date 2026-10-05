<template>
  <div class="grid gap-4">
    <PageHeader :title="t('audit.title')" :description="t('audit.description')">
      <template #actions>
        <RefreshButton :loading="loading" @click="loadAuditLogs" />
      </template>
    </PageHeader>

    <ErrorAlert :message="errorMessage" />

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <DataPanel :loading="loading" :empty="records.length === 0" :empty-title="t('audit.noneFound')" :empty-icon="ScrollTextIcon">
        <template #toolbar>
          <SearchInput v-model="search" :placeholder="t('audit.searchPlaceholder')" />
        </template>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('col.action') }}</TableHead>
              <TableHead>{{ t('col.operator') }}</TableHead>
              <TableHead>{{ t('col.user') }}</TableHead>
              <TableHead>{{ t('col.ip') }}</TableHead>
              <TableHead>{{ t('col.created') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="record in records" :key="record.id">
              <TableCell class="max-w-xl whitespace-normal">
                <Badge variant="outline" class="mb-1 border-primary/30 bg-primary/10 text-primary">{{ record.context || record.audit_type || t('audit.defaultContext') }}</Badge>
                <p class="text-sm">{{ record.description || '-' }}</p>
                <p class="mt-1 truncate text-xs text-muted-foreground">{{ record.user_agent || '-' }}</p>
              </TableCell>
              <TableCell class="font-medium">{{ record.operator || '-' }}</TableCell>
              <TableCell>#{{ record.user_id }}</TableCell>
              <TableCell class="font-mono text-xs text-muted-foreground">{{ record.ip || '-' }}</TableCell>
              <TableCell class="text-muted-foreground">{{ formatDate(record.created_at) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <template #footer>
          <PaginationBar v-model:page="page" v-model:per-page="perPage" :total="total" :item-label="t('items.logs')" />
        </template>
      </DataPanel>

      <SectionCard :title="t('audit.latestActivity')" class="h-max">
        <div class="grid gap-4">
          <div v-for="record in records.slice(0, 6)" :key="`timeline-${record.id}`" class="border-l-2 border-primary/60 pl-3">
            <p class="text-sm font-medium">{{ record.context || t('audit.defaultContext') }}</p>
            <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ record.description || '-' }}</p>
            <p class="mt-1 text-xs text-primary">{{ formatDate(record.created_at) }}</p>
          </div>
          <p v-if="records.length === 0 && !loading" class="text-sm text-muted-foreground">{{ t('audit.noRecentActivity') }}</p>
        </div>
      </SectionCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ScrollTextIcon } from '@lucide/vue'
import { apiErrorMessage, listAuditLogs, type AuditLog } from '@/api/adminApi'
import DataPanel from '@/components/admin/DataPanel.vue'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import PaginationBar from '@/components/admin/PaginationBar.vue'
import RefreshButton from '@/components/admin/RefreshButton.vue'
import SearchInput from '@/components/admin/SearchInput.vue'
import SectionCard from '@/components/admin/SectionCard.vue'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { t } from '@/i18n/adminLanguage'
import { formatDate } from '@/lib/format'

const emit = defineEmits<{
  // Unauthorized loads are surfaced to the shell so it can clear auth and return to login.
  unauthenticated: []
}>()

const loading = ref(false)
const errorMessage = ref('')
const records = ref<AuditLog[]>([])
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const search = ref('')

// loadAuditLogs refreshes the protected audit list while preserving search and pagination state.
const loadAuditLogs = async (): Promise<void> => {
  errorMessage.value = ''
  loading.value = true
  try {
    const result = await listAuditLogs(page.value, perPage.value, search.value)
    records.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('audit.loadFailed'))
    if (errorMessage.value.includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

watch([page, perPage], () => {
  void loadAuditLogs()
})

watch(search, () => {
  if (page.value === 1) void loadAuditLogs()
  else page.value = 1
})

onMounted(() => {
  void loadAuditLogs()
})
</script>
