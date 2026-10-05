<template>
  <div class="grid gap-4">
    <PageHeader :title="t('detail.title')" :description="record?.ticket_no || t('detail.gameRound', { id: gameRoundId })">
      <template #leading>
        <Button variant="outline" size="icon" :title="t('detail.backToRecords')" :aria-label="t('detail.backToRecords')" @click="emit('navigate', '/admin/games')">
          <ArrowLeftIcon />
        </Button>
      </template>
      <template #actions>
        <RefreshButton :loading="loading" @click="loadRecord" />
      </template>
    </PageHeader>

    <ErrorAlert :message="errorMessage" />

    <div v-if="loading && !record" class="grid gap-3 md:grid-cols-4">
      <Skeleton v-for="tile in 4" :key="tile" class="h-24 rounded-xl" />
    </div>

    <template v-else-if="record">
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard :label="t('detail.winner')" :value="winnerLabel(record)" :hint="roundReasonLabel(record.result_reason)" :icon="TrophyIcon" />
        <StatCard :label="t('detail.bet')" :value="formatMoney(record.bet)" :hint="record.ticket_no || t('common.noTicket')" :icon="CoinsIcon" />
        <StatCard :label="t('detail.players')" :value="formatNumber(record.player_count)" :hint="t('detail.roundNumber', { round: record.round_number })" :icon="UsersIcon" />
        <StatCard :label="t('detail.status')" :value="roundStatusView(roundStatus(record)).label" :hint="record.snapshot_id ? t('detail.snapshotNumber', { id: record.snapshot_id }) : t('detail.noSnapshot')" :icon="DatabaseIcon" />
      </section>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="grid content-start gap-4">
          <SectionCard :title="t('detail.players')" :description="t('detail.seated', { count: record.players.length })">
            <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              <article v-for="player in sortedPlayers" :key="player.player_id" class="rounded-lg border bg-muted/50 p-3">
                <div class="mb-3 flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <strong class="block truncate font-medium">{{ player.username || t('common.playerFallback', { id: player.player_id }) }}</strong>
                    <span class="text-xs text-muted-foreground">{{ t('detail.idSeat', { id: player.player_id, seat: player.seat_position || '-' }) }}</span>
                  </div>
                  <StatusBadge :view="outcomeView(player.outcome)" />
                </div>
                <dl class="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt class="text-muted-foreground">{{ t('detail.rank') }}</dt>
                    <dd class="font-medium">{{ player.final_rank || '-' }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t('detail.cardsLeft') }}</dt>
                    <dd class="font-medium">{{ player.cards_left || 0 }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t('detail.payout') }}</dt>
                    <dd class="font-medium tabular-nums" :class="moneyClass(player.payout_amount)">{{ signedMoney(player.payout_amount) }}</dd>
                  </div>
                </dl>
                <p class="mb-3 text-xs text-muted-foreground">{{ roundReasonLabel(player.reason || record.result_reason) }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <PlayingCard v-for="card in player.hand || []" :key="`${player.player_id}-${card.id}`" :card="card" />
                  <span v-if="!player.hand?.length" class="text-xs text-muted-foreground">{{ t('detail.noHand') }}</span>
                </div>
              </article>
            </div>
          </SectionCard>

          <SectionCard :title="t('detail.tableCards')" :description="t('detail.cardCount', { count: record.table_cards.length })">
            <div class="flex flex-wrap gap-2">
              <PlayingCard v-for="card in record.table_cards" :key="`table-${card.id}`" :card="card" size="md" />
              <span v-if="!record.table_cards.length" class="text-sm text-muted-foreground">{{ t('detail.noTableCards') }}</span>
            </div>
          </SectionCard>

          <SectionCard :title="t('detail.history')" :description="t('detail.actionCount', { count: record.last_played?.length || 0 })">
            <div class="grid gap-2">
              <article v-for="(play, index) in record.last_played || []" :key="`${index}-${play.player_id}`" class="grid gap-3 rounded-lg border bg-muted/50 p-3 text-sm md:grid-cols-[7rem_1fr]">
                <div>
                  <strong class="block font-medium">{{ t('detail.move', { number: index + 1 }) }}</strong>
                  <span class="text-xs text-muted-foreground">{{ t('detail.playerSeat', { id: play.player_id, seat: play.seat_number || '-' }) }}</span>
                </div>
                <div>
                  <StatusBadge class="mb-2" :view="play.is_pass ? { label: t('detail.pass'), tone: 'neutral' } : { label: play.combination || t('detail.play'), tone: 'warning' }" />
                  <div class="flex flex-wrap gap-1.5">
                    <PlayingCard v-for="(card, cardIndex) in play.cards || []" :key="`${index}-${cardIndex}`" :card="card" />
                    <span v-if="!play.cards?.length" class="text-xs text-muted-foreground">{{ t('detail.noCards') }}</span>
                  </div>
                </div>
              </article>
              <p v-if="!record.last_played?.length" class="text-sm text-muted-foreground">{{ t('detail.noHistory') }}</p>
            </div>
          </SectionCard>
        </div>

        <aside class="grid content-start gap-4">
          <SectionCard :title="t('detail.context')">
            <dl class="grid gap-3 text-sm">
              <div v-for="item in contextItems" :key="item.label">
                <dt class="text-xs text-muted-foreground">{{ item.label }}</dt>
                <dd class="font-medium">{{ item.value }}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard :title="t('detail.snapshotJson')" flush>
            <pre class="max-h-96 overflow-auto p-4 text-xs text-muted-foreground">{{ formattedSnapshot }}</pre>
          </SectionCard>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowLeftIcon, CoinsIcon, DatabaseIcon, TrophyIcon, UsersIcon } from '@lucide/vue'
import { apiErrorMessage, getGameRecord, type GameRecord, type GameRecordPlayer } from '@/api/adminApi'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import PlayingCard from '@/components/admin/PlayingCard.vue'
import RefreshButton from '@/components/admin/RefreshButton.vue'
import SectionCard from '@/components/admin/SectionCard.vue'
import StatCard from '@/components/admin/StatCard.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatMoney, formatNumber, signedMoney } from '@/lib/format'
import { t } from '@/i18n/adminLanguage'
import { outcomeView, roundReasonLabel, roundStatusView } from '@/lib/status'

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

// sortedPlayers orders by final result first, then seat, so winners are easy to find.
const sortedPlayers = computed<GameRecordPlayer[]>(() => {
  return [...(record.value?.players || [])].sort((a, b) => {
    const rankA = a.final_rank || 99
    const rankB = b.final_rank || 99
    if (rankA !== rankB) return rankA - rankB
    return (a.seat_position || 99) - (b.seat_position || 99)
  })
})

// contextItems lists where and when the round happened for the side card.
const contextItems = computed(() => {
  const current = record.value
  if (!current) return []
  return [
    { label: t('detail.room'), value: current.room_code || t('common.roomFallback', { id: current.parent_room_id }) },
    { label: t('detail.table'), value: `#${current.inner_room_id || '-'}` },
    { label: t('detail.round'), value: String(current.round_number) },
    { label: t('detail.started'), value: formatDate(current.started_at || current.created_at) },
    { label: t('detail.ended'), value: formatDate(current.ended_at) },
  ]
})

// formattedSnapshot exposes the raw stored payload for support/debugging without another database query.
const formattedSnapshot = computed(() => {
  if (!record.value?.snapshot) return '{}'
  return JSON.stringify(record.value.snapshot, null, 2)
})

// loadRecord fetches the selected round snapshot and keeps direct URL refreshes usable.
const loadRecord = async (): Promise<void> => {
  if (!props.gameRoundId) {
    errorMessage.value = t('detail.missingId')
    return
  }
  errorMessage.value = ''
  loading.value = true
  try {
    record.value = await getGameRecord(props.gameRoundId)
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('detail.loadFailed'))
    if (errorMessage.value.includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// roundStatus maps the detail endpoint's numeric round status (3 = snapshot stored) to the summary names.
const roundStatus = (current: GameRecord): string => (current.round_status_id === 3 ? 'finished' : 'playing')

// winnerLabel names the winner from snapshot rankings so operators can understand the round at a glance.
const winnerLabel = (current: GameRecord): string => {
  const winner = current.players.find((player) => player.final_rank === 1 || player.outcome === 'won')
  if (!winner) return current.snapshot_id ? t('detail.noWinner') : t('detail.pending')
  return winner.username || t('common.playerFallback', { id: winner.player_id })
}


// moneyClass highlights positive payouts without treating zero as an error.
const moneyClass = (value = 0): string => {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-destructive'
  return ''
}

watch(
  () => props.gameRoundId,
  () => {
    void loadRecord()
  },
)

onMounted(() => {
  void loadRecord()
})
</script>
