<template>
  <section class="flex h-full min-h-0 w-full flex-col">
    <header class="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
      <div class="flex items-center gap-3">
        <div class="admin-icon-tile h-10 w-10">
          <Icon icon="mdi:account-group" class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-normal">Members</h1>
          <p class="text-sm text-slate-400">Create playable accounts and review current member usernames</p>
        </div>
      </div>

      <button class="admin-icon-button" title="Refresh" @click="loadMembers">
        <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': loading }" />
      </button>
    </header>

    <section class="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form class="admin-panel min-h-0 overflow-auto p-4" @submit.prevent="submitMember">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="font-black">Create Member</h2>
          <Icon icon="mdi:account-plus" class="h-5 w-5 text-gold" />
        </div>

        <div class="grid gap-3">
          <label class="block">
            <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Username</span>
            <input v-model.trim="form.login_id" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm uppercase outline-none ring-gold/40 focus:ring-2" autocomplete="off" />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Password</span>
            <input v-model="form.password" type="password" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" autocomplete="new-password" />
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Nickname</span>
              <input v-model.trim="form.nickname" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Phone</span>
              <input v-model.trim="form.phone" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" />
            </label>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <label v-for="field in limitFields" :key="field.key" class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">{{ field.label }}</span>
              <input v-model.number="form[field.key]" type="number" min="0" step="1" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" />
            </label>
          </div>

          <label class="block">
            <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Remark</span>
            <input v-model.trim="form.remark" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" />
          </label>
        </div>

        <button class="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gold font-black text-ink-950 transition hover:brightness-105 disabled:opacity-60" :disabled="saving">
          <Icon :icon="saving ? 'mdi:loading' : 'mdi:content-save'" class="h-5 w-5" :class="{ 'animate-spin': saving }" />
          {{ saving ? 'Creating' : 'Create member' }}
        </button>
      </form>

      <section class="admin-panel flex min-h-0 flex-col overflow-hidden">
        <div class="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 p-3">
          <div class="relative min-w-64 flex-1">
            <Icon icon="mdi:magnify" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input v-model.trim="search" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 pl-10 pr-3 text-sm outline-none ring-gold/40 focus:ring-2" placeholder="Search username, nickname, phone, ID" />
          </div>
          <select v-model.number="perPage" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none">
            <option :value="10">10 rows</option>
            <option :value="20">20 rows</option>
            <option :value="50">50 rows</option>
          </select>
        </div>

        <div v-if="loading" class="grid min-h-0 flex-1 place-items-center text-slate-400">
          <Icon icon="mdi:loading" class="mb-2 h-7 w-7 animate-spin text-gold" />
          Loading members
        </div>
        <div v-else-if="records.length === 0" class="grid min-h-0 flex-1 place-items-center text-slate-400">
          No members found
        </div>
        <div v-else class="min-h-0 flex-1 overflow-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="sticky top-0 z-10 bg-ink-800 text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-3 font-black">Username</th>
                <th class="px-4 py-3 font-black">Nickname</th>
                <th class="px-4 py-3 font-black">Limits</th>
                <th class="px-4 py-3 font-black">Status</th>
                <th class="px-4 py-3 font-black">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id" class="border-t border-white/10 hover:bg-white/[0.03]">
                <td class="px-4 py-3">
                  <strong class="block">{{ record.login_id }}</strong>
                  <span class="text-xs text-slate-500">#{{ record.id }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="block">{{ record.nickname || '-' }}</span>
                  <span class="text-xs text-slate-500">{{ record.phone || '-' }}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-300">
                  <span class="block">Bet {{ formatNumber(record.min_bet) }} - {{ formatNumber(record.max_bet) }}</span>
                  <span class="block">Win {{ formatNumber(record.max_win) }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="rounded bg-emerald-300/15 px-2 py-1 text-xs font-black text-emerald-200">{{ record.is_active ? 'Active' : 'Inactive' }}</span>
                </td>
                <td class="px-4 py-3 text-slate-300">{{ formatDate(record.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 p-3 text-sm text-slate-400">
          <span>Page {{ page }} · {{ total }} members</span>
          <div class="flex gap-2">
            <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="page <= 1" @click="page--">Previous</button>
            <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">Next</button>
          </div>
        </footer>
      </section>
    </section>

    <p v-if="errorMessage" class="mt-3 shrink-0 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{{ errorMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { createMember, listMembers, type CreateMemberRequest, type Member } from '../api/adminApi'

const emit = defineEmits<{
  // Stale sessions are delegated to the shell so token cleanup stays centralized.
  unauthenticated: []
}>()

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const records = ref<Member[]>([])
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const search = ref('')
const form = reactive<CreateMemberRequest>(defaultMemberForm())

// limitFields defines editable numeric member controls without duplicating form markup.
const limitFields: Array<{ key: keyof Pick<CreateMemberRequest, 'min_bet' | 'max_bet' | 'max_win' | 'max_draw' | 'max_money' | 'max_game'>; label: string }> = [
  { key: 'min_bet', label: 'Min Bet' },
  { key: 'max_bet', label: 'Max Bet' },
  { key: 'max_win', label: 'Max Win' },
  { key: 'max_draw', label: 'Max Draw' },
  { key: 'max_money', label: 'Max Money' },
  { key: 'max_game', label: 'Max Game' },
]

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

// defaultMemberForm gives new members explicit account defaults that match the database lifecycle fields.
function defaultMemberForm(): CreateMemberRequest {
  return {
    login_id: '',
    password: '',
    nickname: '',
    phone: '',
    currency_id: 1,
    language_id: 1,
    role_id: 1,
    min_bet: 0,
    max_bet: 0,
    max_win: 0,
    max_draw: 0,
    max_money: 0,
    max_game: 0,
    remark: '',
  }
}

// loadMembers refreshes the searchable member table while preserving the current page controls.
const loadMembers = async (): Promise<void> => {
  errorMessage.value = ''
  loading.value = true
  try {
    const result = await listMembers(page.value, perPage.value, search.value)
    records.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load members'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// submitMember creates a member and reloads the first page so the newest username is immediately visible.
const submitMember = async (): Promise<void> => {
  errorMessage.value = ''
  saving.value = true
  try {
    await createMember({ ...form, login_id: form.login_id.toUpperCase() })
    Object.assign(form, defaultMemberForm())
    page.value = 1
    await loadMembers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to create member'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    saving.value = false
  }
}

// formatDate keeps member timestamps readable in the operator's browser locale.
const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

// formatNumber keeps account limits compact enough for dense table cells.
const formatNumber = (value: number): string => Number(value || 0).toLocaleString()

watch([page, perPage], () => {
  void loadMembers()
})

watch(search, () => {
  page.value = 1
  void loadMembers()
})

onMounted(() => {
  void loadMembers()
})
</script>
