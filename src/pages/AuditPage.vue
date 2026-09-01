<template>
  <section class="flex min-h-[calc(100vh-6.5rem)] w-full flex-col">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div class="flex items-center gap-3">
        <div class="admin-icon-tile h-10 w-10">
          <Icon icon="mdi:clipboard-text-clock" class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-normal">Audit</h1>
          <p class="text-sm text-slate-400">Operational activity timeline and admin action review</p>
        </div>
      </div>

      <button class="admin-icon-button" title="Refresh" @click="loadAuditLogs">
        <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': loading }" />
      </button>
    </header>

    <section class="admin-panel mb-4 flex flex-wrap items-center gap-3 p-3">
      <div class="relative min-w-64 flex-1">
        <Icon icon="mdi:magnify" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input v-model.trim="search" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 pl-10 pr-3 text-sm outline-none ring-gold/40 focus:ring-2" placeholder="Search context, operator, IP, description" />
      </div>
      <select v-model.number="perPage" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none">
        <option :value="10">10 rows</option>
        <option :value="20">20 rows</option>
        <option :value="50">50 rows</option>
      </select>
    </section>

    <section class="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div class="admin-panel min-h-0 overflow-hidden">
        <div v-if="loading" class="grid h-80 place-items-center text-slate-400">
          <Icon icon="mdi:loading" class="mb-2 h-7 w-7 animate-spin text-gold" />
          Loading audit logs
        </div>
        <div v-else-if="records.length === 0" class="grid h-80 place-items-center text-slate-400">
          No audit logs found
        </div>
        <div v-else class="overflow-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="sticky top-0 z-10 bg-ink-800 text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-3 font-black">Action</th>
                <th class="px-4 py-3 font-black">Operator</th>
                <th class="px-4 py-3 font-black">User</th>
                <th class="px-4 py-3 font-black">IP</th>
                <th class="px-4 py-3 font-black">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id" class="border-t border-white/10 hover:bg-white/[0.03]">
                <td class="max-w-xl px-4 py-3">
                  <span class="mb-1 inline-flex rounded bg-gold/15 px-2 py-1 text-xs font-black text-gold">{{ record.context || record.audit_type || 'Audit' }}</span>
                  <p class="text-sm text-slate-200">{{ record.description || '-' }}</p>
                  <p class="mt-1 truncate text-xs text-slate-500">{{ record.user_agent || '-' }}</p>
                </td>
                <td class="px-4 py-3 font-black">{{ record.operator || '-' }}</td>
                <td class="px-4 py-3">#{{ record.user_id }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-300">{{ record.ip || '-' }}</td>
                <td class="px-4 py-3 text-slate-300">{{ formatDate(record.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <aside class="admin-panel h-max overflow-hidden">
        <div class="border-b border-white/10 px-4 py-3">
          <h2 class="font-black">Latest Activity</h2>
        </div>
        <div class="grid gap-3 p-4">
          <div v-for="record in records.slice(0, 6)" :key="`timeline-${record.id}`" class="border-l-2 border-gold/60 pl-3">
            <p class="text-sm font-black">{{ record.context || 'Audit' }}</p>
            <p class="mt-1 line-clamp-2 text-xs text-slate-400">{{ record.description || '-' }}</p>
            <p class="mt-2 text-xs text-gold">{{ formatDate(record.created_at) }}</p>
          </div>
          <p v-if="records.length === 0 && !loading" class="text-sm text-slate-400">No recent activity</p>
        </div>
      </aside>
    </section>

    <footer class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
      <span>Page {{ page }} · {{ total }} total logs</span>
      <div class="flex gap-2">
        <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="page <= 1" @click="page--">Previous</button>
        <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">Next</button>
      </div>
    </footer>

    <p v-if="errorMessage" class="mt-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{{ errorMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { listAuditLogs, type AuditLog } from '../api/adminApi'

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

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

// loadAuditLogs refreshes the protected audit list while preserving search and pagination state.
const loadAuditLogs = async (): Promise<void> => {
  errorMessage.value = ''
  loading.value = true
  try {
    const result = await listAuditLogs(page.value, perPage.value, search.value)
    records.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load audit logs'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// formatDate keeps audit timestamps readable in the operator's browser locale.
const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

watch([page, perPage], () => {
  void loadAuditLogs()
})

watch(search, () => {
  page.value = 1
  void loadAuditLogs()
})

onMounted(() => {
  void loadAuditLogs()
})
</script>
