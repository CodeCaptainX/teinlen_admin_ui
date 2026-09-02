<template>
  <section class="flex min-h-[calc(100vh-6.5rem)] w-full flex-col">
      <header class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div class="flex items-center gap-3">
          <div class="grid h-10 w-10 place-items-center rounded-md bg-gold text-ink-950">
            <Icon icon="mdi:view-dashboard" class="h-5 w-5" />
          </div>
          <div>
            <h1 class="text-2xl font-black tracking-normal">Game Records</h1>
            <p class="text-sm text-slate-400">Completed round snapshots, winners, player hands, and finish reasons</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button class="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-ink-800 text-slate-200 hover:bg-ink-700" title="Refresh" @click="loadGames">
            <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </header>

      <section class="mb-4 grid gap-3 sm:grid-cols-3">
        <div v-for="stat in stats" :key="stat.label" class="rounded-lg border border-white/10 bg-ink-900 p-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-slate-400">{{ stat.label }}</span>
            <Icon :icon="stat.icon" class="h-5 w-5 text-gold" />
          </div>
          <strong class="text-2xl font-black">{{ stat.value }}</strong>
        </div>
      </section>

      <section class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-ink-900 p-3">
        <div class="relative min-w-64 flex-1">
          <Icon icon="mdi:magnify" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input v-model.trim="search" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 pl-10 pr-3 text-sm outline-none ring-gold/40 focus:ring-2" placeholder="Search ticket, room, winner, reason, player id" />
        </div>
        <select v-model.number="perPage" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none">
          <option :value="10">10 rows</option>
          <option :value="20">20 rows</option>
          <option :value="50">50 rows</option>
        </select>
      </section>

      <section class="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-ink-900 shadow-panel">
        <div v-if="loading" class="grid h-80 place-items-center text-slate-400">
          <Icon icon="mdi:loading" class="mb-2 h-7 w-7 animate-spin text-gold" />
          Loading games
        </div>
        <div v-else-if="filteredRecords.length === 0" class="grid h-80 place-items-center text-slate-400">
          No game records found
        </div>
        <div v-else class="overflow-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="sticky top-0 z-10 bg-ink-800 text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-3 font-black">Game</th>
                <th class="px-4 py-3 font-black">Ticket</th>
                <th class="px-4 py-3 font-black">Room</th>
                <th class="px-4 py-3 font-black">Round</th>
                <th class="px-4 py-3 font-black">Players</th>
                <th class="px-4 py-3 font-black">Result</th>
                <th class="px-4 py-3 font-black">Started</th>
                <th class="px-4 py-3 font-black">Status</th>
                <th class="px-4 py-3 font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="record in filteredRecords" :key="record.game_round_id">
                <tr class="border-t border-white/10 hover:bg-white/[0.03]">
                  <td class="px-4 py-3 font-black">#{{ record.game_id }}</td>
                  <td class="px-4 py-3">
                    <button class="inline-flex max-w-56 items-center gap-2 rounded-md border border-gold/35 bg-gold/10 px-2.5 py-1.5 text-left font-mono text-xs font-black text-gold transition hover:border-gold/70 hover:bg-gold/15 focus:outline-none focus:ring-2 focus:ring-gold/40" title="Open round detail" @click="openDetail(record)">
                      <Icon icon="mdi:ticket-confirmation" class="h-4 w-4 shrink-0" />
                      <span class="truncate">{{ record.ticket_no || 'No ticket' }}</span>
                    </button>
                  </td>
                  <td class="px-4 py-3">{{ record.room_code || `Room ${record.parent_room_id}` }}</td>
                  <td class="px-4 py-3">Round {{ record.round_number }}</td>
                  <td class="px-4 py-3">{{ record.player_count }}</td>
                  <td class="px-4 py-3">
                    <span class="block font-black">{{ winnerLabel(record) }}</span>
                    <span class="text-xs text-slate-500">{{ reasonLabel(record.result_reason) }}</span>
                  </td>
                  <td class="px-4 py-3 text-slate-300">{{ formatDate(record.started_at || record.created_at) }}</td>
                  <td class="px-4 py-3">
                    <span class="rounded px-2 py-1 text-xs font-black" :class="statusClass(record.round_status_id)">
                      {{ statusLabel(record.round_status_id) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <button class="mr-2 inline-grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-ink-800 text-slate-100 hover:bg-ink-700" title="Quick view" @click="toggleExpanded(record.game_round_id)">
                      <Icon :icon="expandedRoundId === record.game_round_id ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="h-4 w-4 text-gold" />
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-ink-800 px-3 text-xs font-black text-slate-100 hover:bg-ink-700" @click="openDetail(record)">
                      <Icon icon="mdi:open-in-new" class="h-4 w-4 text-gold" />
                      Details
                    </button>
                  </td>
                </tr>
                <tr v-if="expandedRoundId === record.game_round_id">
                  <td colspan="9" class="border-t border-white/10 bg-ink-950 px-4 py-3">
                    <div class="mb-3 grid gap-3 text-xs sm:grid-cols-3">
                      <div class="rounded-md border border-white/10 bg-ink-900 p-3">
                        <dt class="text-slate-500">Finish reason</dt>
                        <dd class="mt-1 font-black">{{ reasonLabel(record.result_reason) }}</dd>
                      </div>
                      <div class="rounded-md border border-white/10 bg-ink-900 p-3">
                        <dt class="text-slate-500">Bet</dt>
                        <dd class="mt-1 font-black">{{ formatMoney(record.bet || 0) }}</dd>
                      </div>
                      <div class="rounded-md border border-white/10 bg-ink-900 p-3">
                        <dt class="text-slate-500">Snapshot</dt>
                        <dd class="mt-1 font-black">{{ record.snapshot_id ? `#${record.snapshot_id}` : 'Not finished yet' }}</dd>
                      </div>
                    </div>

                    <div v-if="record.table_cards?.length" class="mb-3 rounded-md border border-white/10 bg-ink-900 p-3">
                      <div class="mb-2 text-xs font-black uppercase text-slate-500">Final table cards</div>
                      <div class="flex flex-wrap gap-1.5">
                        <span v-for="card in record.table_cards" :key="`table-${record.game_round_id}-${card.id}`" class="rounded border border-white/10 bg-ink-800 px-2 py-1 font-mono text-xs font-black" :class="cardSuitClass(card)">
                          {{ cardLabel(card) }}
                        </span>
                      </div>
                    </div>

                    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div v-for="player in record.players" :key="`${record.game_round_id}-${player.player_id}`" class="rounded-md border border-white/10 bg-ink-900 p-3">
                        <div class="mb-2 flex items-center justify-between">
                          <strong>{{ player.username || `Player ${player.player_id}` }}</strong>
                          <span class="text-xs text-slate-400">Seat {{ player.seat_position || '-' }}</span>
                        </div>
                        <dl class="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <dt class="text-slate-500">Rank</dt>
                            <dd class="font-black">{{ player.final_rank || '-' }}</dd>
                          </div>
                          <div>
                            <dt class="text-slate-500">Cards</dt>
                            <dd class="font-black">{{ player.cards_left || '-' }}</dd>
                          </div>
                          <div>
                            <dt class="text-slate-500">Status</dt>
                            <dd class="font-black" :class="outcomeClass(player.outcome)">{{ player.outcome || statusLabel(player.status_id) }}</dd>
                          </div>
                        </dl>
                        <div class="mt-2 text-xs text-slate-500">{{ reasonLabel(player.reason || record.result_reason) }}</div>
                        <div v-if="player.hand?.length" class="mt-3 flex flex-wrap gap-1.5">
                          <span v-for="card in player.hand" :key="`${record.game_round_id}-${player.player_id}-${card.id}`" class="rounded border border-white/10 bg-ink-800 px-2 py-1 font-mono text-xs font-black" :class="cardSuitClass(card)">
                            {{ cardLabel(card) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>

      <footer class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <span>Page {{ page }} · {{ total }} total records</span>
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
import { listGameRecords, type GameRecord, type GameRecordCard } from '../api/adminApi'

const emit = defineEmits<{
  // Unauthorized loads are surfaced to the shell so it can clear auth and return to login.
  unauthenticated: []
  // Parent shell owns path changes because this admin app uses a lightweight custom router.
  navigate: [path: string]
}>()

const loading = ref(false)
const errorMessage = ref('')
const records = ref<GameRecord[]>([])
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const search = ref('')
const expandedRoundId = ref<number | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const stats = computed(() => [
  { label: 'Round records', value: total.value.toLocaleString(), icon: 'mdi:cards' },
  { label: 'Visible players', value: records.value.reduce((sum, record) => sum + record.player_count, 0).toLocaleString(), icon: 'mdi:account-group' },
  { label: 'Snapshots visible', value: records.value.filter((record) => record.snapshot_id).length.toLocaleString(), icon: 'mdi:database-check' },
])

const filteredRecords = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return records.value
  return records.value.filter((record) => {
    const haystack = [
      record.ticket_no,
      record.room_code,
      record.result_reason,
      record.game_id,
      record.round_number,
      ...record.players.flatMap((player) => [player.player_id, player.username, player.outcome, player.reason]),
    ].join(' ').toLowerCase()
    return haystack.includes(term)
  })
})

// loadGames refreshes the current admin game page while preserving the selected pagination state.
const loadGames = async (): Promise<void> => {
  errorMessage.value = ''
  loading.value = true
  try {
    const result = await listGameRecords(page.value, perPage.value)
    records.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load games'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// toggleExpanded switches the detail row for a game round while keeping only one row open.
const toggleExpanded = (roundId: number): void => {
  expandedRoundId.value = expandedRoundId.value === roundId ? null : roundId
}

// openDetail navigates to the dedicated round page without relying on a full browser reload.
const openDetail = (record: GameRecord): void => {
  emit('navigate', `/admin/games/${record.game_round_id}`)
}

// formatDate centralizes date rendering so table rows use the browser locale consistently.
const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

// formatMoney keeps entry-fee and payout values aligned with the finance admin pages.
const formatMoney = (value: number): string => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// statusLabel maps backend status ids to compact operator-facing labels.
const statusLabel = (statusId: number): string => {
  if (statusId === 1) return 'Active'
  if (statusId === 2) return 'Playing'
  if (statusId === 3) return 'Finished'
  return statusId ? `Status ${statusId}` : '-'
}

// statusClass keeps backend status ids visually scannable in the record table.
const statusClass = (statusId: number): string => {
  if (statusId === 2) return 'bg-gold/15 text-gold'
  if (statusId === 3) return 'bg-emerald-400/15 text-emerald-300'
  return 'bg-slate-500/15 text-slate-300'
}

// winnerLabel names the winning player from snapshot rankings so operators can scan completed rounds quickly.
const winnerLabel = (record: GameRecord): string => {
  const winner = record.players.find((player) => player.final_rank === 1 || player.outcome === 'won')
  if (!winner) return record.snapshot_id ? 'No winner' : 'Pending snapshot'
  return winner.username || `Player ${winner.player_id}`
}

// reasonLabel converts stored lifecycle reasons into plain admin labels without hiding unknown values.
const reasonLabel = (reason = ''): string => {
  if (reason === 'left_mid_game' || reason === 'player_left') return 'Player left'
  if (reason === 'offline_mid_game' || reason === 'player_offline') return 'Player offline'
  if (reason === 'round_finished') return 'Normal finish'
  if (reason === 'auto_win') return 'Auto win'
  return reason || '-'
}

// outcomeClass highlights winner/loser state inside the expanded player snapshot.
const outcomeClass = (outcome = ''): string => {
  if (outcome === 'won') return 'text-emerald-300'
  if (outcome === 'lost') return 'text-coral'
  if (outcome === 'ranked') return 'text-gold'
  return 'text-slate-200'
}

// cardLabel renders stored snapshot cards, including compact values like "2H" from older rows.
const cardLabel = (card: GameRecordCard | string): string => {
  if (typeof card === 'string') return card
  if (card.label || card.code || card.card || card.value) return card.label || card.code || card.card || card.value || ''
  if (card.rank || card.suit) return `${card.rank || 'Unknown'}${card.suit || ''}`
  return card.id ? `Card #${card.id}` : 'Unknown card'
}

// cardSuitClass gives red suits a different tone while keeping compact text cards readable.
const cardSuitClass = (card: GameRecordCard | string): string => {
  const label = typeof card === 'string' ? card : card.suit || card.label || card.code || card.card || card.value || ''
  if (label.endsWith('D') || label.endsWith('H')) return 'text-coral'
  return 'text-slate-100'
}

watch([page, perPage], () => {
  expandedRoundId.value = null
  void loadGames()
})

onMounted(() => {
  void loadGames()
})
</script>
