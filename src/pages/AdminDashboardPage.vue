<template>
  <section class="flex min-h-[calc(100vh-6.5rem)] w-full flex-col">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-md bg-gold text-ink-950">
          <Icon icon="mdi:view-dashboard" class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-normal">Dashboard</h1>
          <p class="text-sm text-slate-400">Admin overview for persisted Tien Len game activity</p>
        </div>
      </div>

      <button class="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-ink-800 text-slate-200 hover:bg-ink-700" title="Refresh" @click="loadOverview">
        <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': loading }" />
      </button>
    </header>

    <section class="mb-4 grid gap-3 md:grid-cols-3">
      <div v-for="stat in overviewStats" :key="stat.label" class="rounded-lg border border-white/10 bg-ink-900 p-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <span class="text-xs font-bold uppercase text-slate-400">{{ stat.label }}</span>
          <Icon :icon="stat.icon" class="h-5 w-5 text-gold" />
        </div>
        <strong class="text-2xl font-black">{{ stat.value }}</strong>
      </div>
    </section>

    <section class="grid flex-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="rounded-lg border border-white/10 bg-ink-900 shadow-panel">
        <div class="border-b border-white/10 px-4 py-3">
          <h2 class="font-black">Recent Games</h2>
        </div>
        <div v-if="loading" class="grid h-72 place-items-center text-slate-400">
          <Icon icon="mdi:loading" class="mb-2 h-7 w-7 animate-spin text-gold" />
          Loading overview
        </div>
        <div v-else-if="recentRecords.length === 0" class="grid h-72 place-items-center text-slate-400">
          No recent games found
        </div>
        <div v-else class="overflow-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-ink-800 text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-3 font-black">Game</th>
                <th class="px-4 py-3 font-black">Room</th>
                <th class="px-4 py-3 font-black">Players</th>
                <th class="px-4 py-3 font-black">Started</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in recentRecords" :key="record.game_round_id" class="border-t border-white/10 hover:bg-white/[0.03]">
                <td class="px-4 py-3 font-black">#{{ record.game_id }}</td>
                <td class="px-4 py-3">{{ record.room_code || `Room ${record.parent_room_id}` }}</td>
                <td class="px-4 py-3">{{ record.player_count }}</td>
                <td class="px-4 py-3 text-slate-300">{{ formatDate(record.started_at || record.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <aside class="rounded-lg border border-white/10 bg-ink-900 p-4 shadow-panel">
        <h2 class="mb-3 font-black">Admin Pages</h2>
        <button class="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-ink-800 px-3 py-3 text-left hover:bg-ink-700" @click="$emit('navigate', '/admin/games')">
          <span>
            <span class="block font-black">Game Records</span>
            <span class="text-sm text-slate-400">Review rounds, tickets, rooms, and players</span>
          </span>
          <Icon icon="mdi:chevron-right" class="h-5 w-5 text-gold" />
        </button>
        <p v-if="errorMessage" class="mt-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{{ errorMessage }}</p>
      </aside>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { listGameRecords, type GameRecord } from '../api/adminApi'

const emit = defineEmits<{
  // Navigation is emitted to the shell so browser history remains centralized in App.vue.
  navigate: [path: string]
  // Unauthorized overview loads are handled by the shell to clear stale stored tokens.
  unauthenticated: []
}>()

const loading = ref(false)
const errorMessage = ref('')
const recentRecords = ref<GameRecord[]>([])
const total = ref(0)

const overviewStats = computed(() => [
  { label: 'Total games', value: total.value.toLocaleString(), icon: 'mdi:cards' },
  { label: 'Recent players', value: recentRecords.value.reduce((sum, record) => sum + record.player_count, 0).toLocaleString(), icon: 'mdi:account-group' },
  { label: 'Recent tickets', value: recentRecords.value.filter((record) => record.ticket_no).length.toLocaleString(), icon: 'mdi:ticket-confirmation' },
])

// loadOverview fetches a small first page so the dashboard stays fast and uses the existing records endpoint.
const loadOverview = async (): Promise<void> => {
  errorMessage.value = ''
  loading.value = true
  try {
    const result = await listGameRecords(1, 5)
    recentRecords.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load dashboard'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// formatDate keeps the dashboard table consistent with the game records page.
const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

onMounted(() => {
  void loadOverview()
})
</script>
