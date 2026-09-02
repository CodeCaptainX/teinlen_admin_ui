<template>
  <section class="flex min-h-[calc(100vh-6.5rem)] w-full flex-col">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div class="flex items-center gap-3">
        <button class="admin-icon-button" title="Back to games" @click="emit('navigate', '/admin/games')">
          <Icon icon="mdi:arrow-left" class="h-5 w-5" />
        </button>
        <div>
          <h1 class="text-2xl font-black tracking-normal">Round Detail</h1>
          <p class="text-sm text-slate-400">{{ record?.ticket_no || `Game round #${gameRoundId}` }}</p>
        </div>
      </div>

      <button class="admin-icon-button" title="Refresh" @click="loadRecord">
        <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': loading }" />
      </button>
    </header>

    <div v-if="loading" class="admin-panel grid h-80 place-items-center text-slate-400">
      <div class="text-center">
        <Icon icon="mdi:loading" class="mx-auto mb-2 h-7 w-7 animate-spin text-gold" />
        Loading round detail
      </div>
    </div>

    <div v-else-if="errorMessage" class="rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
      {{ errorMessage }}
    </div>

    <div v-else-if="record" class="grid min-h-0 flex-1 gap-4">
      <section class="grid gap-3 md:grid-cols-4">
        <div v-for="stat in summaryStats" :key="stat.label" class="admin-panel p-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-slate-400">{{ stat.label }}</span>
            <Icon :icon="stat.icon" class="h-5 w-5 text-gold" />
          </div>
          <strong class="block text-xl font-black">{{ stat.value }}</strong>
          <span v-if="stat.detail" class="mt-1 block text-xs text-slate-500">{{ stat.detail }}</span>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="grid gap-4">
          <div class="admin-panel overflow-hidden">
            <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 class="font-black">Players</h2>
              <span class="text-xs font-bold uppercase text-slate-500">{{ record.players.length }} seated</span>
            </div>
            <div class="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
              <article v-for="player in sortedPlayers" :key="player.player_id" class="rounded-md border border-white/10 bg-ink-800 p-3">
                <div class="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <strong class="block">{{ player.username || `Player ${player.player_id}` }}</strong>
                    <span class="text-xs text-slate-500">ID #{{ player.player_id }} · Seat {{ player.seat_position || '-' }}</span>
                  </div>
                  <span class="rounded px-2 py-1 text-xs font-black" :class="outcomePillClass(player.outcome)">
                    {{ player.outcome || statusLabel(player.status_id) }}
                  </span>
                </div>

                <dl class="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt class="text-slate-500">Rank</dt>
                    <dd class="font-black">{{ player.final_rank || '-' }}</dd>
                  </div>
                  <div>
                    <dt class="text-slate-500">Cards left</dt>
                    <dd class="font-black">{{ player.cards_left || 0 }}</dd>
                  </div>
                  <div>
                    <dt class="text-slate-500">Payout</dt>
                    <dd class="font-black" :class="moneyClass(player.payout_amount)">{{ signedMoney(player.payout_amount) }}</dd>
                  </div>
                </dl>

                <p class="mb-3 text-xs text-slate-500">{{ reasonLabel(player.reason || record.result_reason) }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="card in player.hand || []" :key="`${player.player_id}-${card.id}`" class="rounded border border-white/10 bg-ink-900 px-2 py-1 font-mono text-xs font-black" :class="cardSuitClass(card)">
                    {{ cardLabel(card) }}
                  </span>
                  <span v-if="!player.hand?.length" class="text-xs text-slate-500">No stored hand cards</span>
                </div>
              </article>
            </div>
          </div>

          <div class="admin-panel overflow-hidden">
            <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 class="font-black">Final Table Cards</h2>
              <span class="text-xs font-bold uppercase text-slate-500">{{ record.table_cards.length }} cards</span>
            </div>
            <div class="flex flex-wrap gap-2 p-4">
              <span v-for="card in record.table_cards" :key="`table-${card.id}`" class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-mono text-sm font-black" :class="cardSuitClass(card)">
                {{ cardLabel(card) }}
              </span>
              <span v-if="!record.table_cards.length" class="text-sm text-slate-500">No table cards stored</span>
            </div>
          </div>

          <div class="admin-panel overflow-hidden">
            <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 class="font-black">Play History</h2>
              <span class="text-xs font-bold uppercase text-slate-500">{{ record.last_played?.length || 0 }} actions</span>
            </div>
            <div class="grid gap-2 p-3">
              <article v-for="(play, index) in record.last_played || []" :key="`${index}-${play.player_id}`" class="grid gap-3 rounded-md border border-white/10 bg-ink-800 p-3 text-sm md:grid-cols-[7rem_1fr]">
                <div>
                  <strong class="block">Move {{ index + 1 }}</strong>
                  <span class="text-xs text-slate-500">Player #{{ play.player_id }} · Seat {{ play.seat_number || '-' }}</span>
                </div>
                <div>
                  <span class="mb-2 inline-flex rounded px-2 py-1 text-xs font-black" :class="play.is_pass ? 'bg-slate-500/15 text-slate-300' : 'bg-gold/15 text-gold'">
                    {{ play.is_pass ? 'Pass' : play.combination || 'Play' }}
                  </span>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="(card, cardIndex) in play.cards || []" :key="cardKey(card, `${index}-${cardIndex}`)" class="rounded border border-white/10 bg-ink-900 px-2 py-1 font-mono text-xs font-black" :class="cardSuitClass(card)">
                      {{ cardLabel(card) }}
                    </span>
                    <span v-if="!play.cards?.length" class="text-xs text-slate-500">No cards</span>
                  </div>
                </div>
              </article>
              <div v-if="!record.last_played?.length" class="rounded-md border border-white/10 bg-ink-800 p-4 text-sm text-slate-500">
                No play history stored
              </div>
            </div>
          </div>
        </div>

        <aside class="grid content-start gap-4">
          <section class="admin-panel p-4">
            <h2 class="mb-3 font-black">Round Context</h2>
            <dl class="grid gap-3 text-sm">
              <div>
                <dt class="text-xs font-bold uppercase text-slate-500">Room</dt>
                <dd class="font-black">{{ record.room_code || `Room ${record.parent_room_id}` }}</dd>
              </div>
              <div>
                <dt class="text-xs font-bold uppercase text-slate-500">Inner Room</dt>
                <dd class="font-black">#{{ record.inner_room_id || '-' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-bold uppercase text-slate-500">Round</dt>
                <dd class="font-black">{{ record.round_number }}</dd>
              </div>
              <div>
                <dt class="text-xs font-bold uppercase text-slate-500">Started</dt>
                <dd class="font-black">{{ formatDate(record.started_at || record.created_at) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-bold uppercase text-slate-500">Ended</dt>
                <dd class="font-black">{{ formatDate(record.ended_at) }}</dd>
              </div>
            </dl>
          </section>

          <section class="admin-panel overflow-hidden">
            <div class="border-b border-white/10 px-4 py-3">
              <h2 class="font-black">Snapshot JSON</h2>
            </div>
            <pre class="max-h-96 overflow-auto p-4 text-xs text-slate-300">{{ formattedSnapshot }}</pre>
          </section>
        </aside>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getGameRecord, type GameRecord, type GameRecordCard, type GameRecordPlayer } from '../api/adminApi'

const props = defineProps<{
  gameRoundId: number
}>()

const emit = defineEmits<{
  // Parent shell owns path changes because this admin app uses a lightweight custom router.
  navigate: [path: string]
  // Unauthorized loads are surfaced to the shell so it can clear auth and return to login.
  unauthenticated: []
}>()

const loading = ref(false)
const errorMessage = ref('')
const record = ref<GameRecord | null>(null)

// summaryStats keeps top-level round facts visible before admins inspect each player's hand.
const summaryStats = computed(() => {
  const current = record.value
  if (!current) return []
  return [
    { label: 'Winner', value: winnerLabel(current), detail: reasonLabel(current.result_reason), icon: 'mdi:trophy' },
    { label: 'Bet', value: formatMoney(current.bet || 0), detail: current.ticket_no || 'No ticket', icon: 'mdi:cash' },
    { label: 'Players', value: current.player_count.toLocaleString(), detail: `Round ${current.round_number}`, icon: 'mdi:account-group' },
    { label: 'Status', value: statusLabel(current.round_status_id), detail: current.snapshot_id ? `Snapshot #${current.snapshot_id}` : 'No snapshot yet', icon: 'mdi:database-check' },
  ]
})

// sortedPlayers orders by final result first, then seat, so winners are easy to find.
const sortedPlayers = computed<GameRecordPlayer[]>(() => {
  return [...(record.value?.players || [])].sort((a, b) => {
    const rankA = a.final_rank || 99
    const rankB = b.final_rank || 99
    if (rankA !== rankB) return rankA - rankB
    return (a.seat_position || 99) - (b.seat_position || 99)
  })
})

// formattedSnapshot exposes the raw stored payload for support/debugging without another database query.
const formattedSnapshot = computed(() => {
  if (!record.value?.snapshot) return '{}'
  return JSON.stringify(record.value.snapshot, null, 2)
})

// loadRecord fetches the selected round snapshot and keeps direct URL refreshes usable.
const loadRecord = async (): Promise<void> => {
  if (!props.gameRoundId) {
    errorMessage.value = 'Missing game round id'
    return
  }
  errorMessage.value = ''
  loading.value = true
  try {
    record.value = await getGameRecord(props.gameRoundId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load round detail'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// formatDate centralizes date rendering so audit timestamps use one browser-local format.
const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

// formatMoney keeps bet and payout values aligned with the finance pages.
const formatMoney = (value: number): string => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// signedMoney makes player payout direction clear in the player cards.
const signedMoney = (value = 0): string => {
  const amount = Number(value || 0)
  if (amount > 0) return `+${formatMoney(amount)}`
  return formatMoney(amount)
}

// moneyClass highlights positive payouts without treating zero as an error.
const moneyClass = (value = 0): string => {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-coral'
  return 'text-slate-200'
}

// statusLabel maps backend status ids to compact operator-facing labels.
const statusLabel = (statusId: number): string => {
  if (statusId === 1) return 'Active'
  if (statusId === 2) return 'Playing'
  if (statusId === 3) return 'Finished'
  return statusId ? `Status ${statusId}` : '-'
}

// winnerLabel names the winner from snapshot rankings so operators can understand the round at a glance.
const winnerLabel = (current: GameRecord): string => {
  const winner = current.players.find((player) => player.final_rank === 1 || player.outcome === 'won')
  if (!winner) return current.snapshot_id ? 'No winner' : 'Pending snapshot'
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

// outcomePillClass gives rank outcomes the same scan pattern used by the list page.
const outcomePillClass = (outcome = ''): string => {
  if (outcome === 'won') return 'bg-emerald-400/15 text-emerald-300'
  if (outcome === 'lost') return 'bg-coral/15 text-coral'
  if (outcome === 'ranked') return 'bg-gold/15 text-gold'
  return 'bg-slate-500/15 text-slate-300'
}

// cardKey keeps card lists stable when history snapshots store compact string cards instead of database ids.
const cardKey = (card: GameRecordCard | string, fallback: string): string => {
  if (typeof card === 'string') return `${fallback}-${card}`
  return `${fallback}-${card.id || card.label || card.code || card.card || card.value || card.rank || 'card'}`
}

// cardLabel renders stored snapshot cards, including compact values like "2H" from older play history rows.
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

watch(() => props.gameRoundId, () => {
  void loadRecord()
})

onMounted(() => {
  void loadRecord()
})
</script>
