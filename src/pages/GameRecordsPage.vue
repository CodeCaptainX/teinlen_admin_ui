<template>
  <div class="grid gap-4">
    <PageHeader :title="t('records.title')" :description="t('records.description')">
      <template #actions>
        <RefreshButton :loading="loading" @click="loadGames()" />
      </template>
    </PageHeader>

    <ErrorAlert :message="errorMessage" />

    <section class="grid gap-3 sm:grid-cols-3">
      <StatCard :label="t('records.totalRounds')" :value="formatNumber(total)" :icon="SpadeIcon" />
      <StatCard :label="t('records.playingOnPage')" :value="formatNumber(countByStatus('playing'))" :icon="ActivityIcon" />
      <StatCard :label="t('records.abortedOnPage')" :value="formatNumber(countByStatus('aborted'))" :icon="CircleStopIcon" />
    </section>

    <DataPanel :loading="loading" :empty="filteredRecords.length === 0" :empty-title="t('records.noneFound')" :empty-icon="SpadeIcon">
      <template #toolbar>
        <SearchInput v-model="search" :placeholder="t('records.searchPlaceholder')" />
      </template>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('col.ticket') }}</TableHead>
            <TableHead>{{ t('col.room') }}</TableHead>
            <TableHead>{{ t('col.status') }}</TableHead>
            <TableHead>{{ t('col.winner') }}</TableHead>
            <TableHead>{{ t('col.result') }}</TableHead>
            <TableHead class="text-right">{{ t('col.players') }}</TableHead>
            <TableHead class="text-right">{{ t('col.bet') }}</TableHead>
            <TableHead>{{ t('col.started') }}</TableHead>
            <TableHead>{{ t('col.duration') }}</TableHead>
            <TableHead><span class="sr-only">{{ t('col.open') }}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- The whole row opens the detail page; Enter works too so the list stays keyboard friendly. -->
          <TableRow
            v-for="record in filteredRecords"
            :key="record.game_round_id"
            class="cursor-pointer focus-visible:bg-accent focus-visible:outline-none"
            tabindex="0"
            :title="t('records.openRound', { ticket: record.ticket_no || record.game_round_id })"
            @click="openDetail(record)"
            @keydown.enter="openDetail(record)"
          >
            <TableCell class="font-mono text-xs text-primary">{{ record.ticket_no || t('common.noTicket') }}</TableCell>
            <TableCell>
              <span class="block font-medium">{{ record.room_code || t('common.roomFallback', { id: record.parent_room_id }) }}</span>
              <span class="text-xs text-muted-foreground">{{ t('records.tableRound', { table: record.inner_room_id || '-', round: record.round_number }) }}</span>
            </TableCell>
            <TableCell><StatusBadge :view="roundStatusView(record.status)" :pulse="record.status === 'playing'" /></TableCell>
            <TableCell class="font-medium">{{ winnerLabel(record) }}</TableCell>
            <TableCell class="text-muted-foreground">{{ roundReasonLabel(record.result_reason) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ record.player_count }}</TableCell>
            <TableCell class="text-right font-mono tabular-nums">{{ formatMoney(record.bet) }}</TableCell>
            <TableCell class="text-muted-foreground">{{ formatDate(record.started_at) }}</TableCell>
            <TableCell class="text-muted-foreground">{{ formatDuration(record.started_at, record.ended_at) }}</TableCell>
            <TableCell class="text-right"><ChevronRightIcon class="inline size-4 text-muted-foreground" /></TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <template #footer>
        <PaginationBar v-model:page="page" v-model:per-page="perPage" :total="total" :item-label="t('items.rounds')" />
      </template>
    </DataPanel>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ActivityIcon, ChevronRightIcon, CircleStopIcon, SpadeIcon } from '@lucide/vue'
import { apiErrorMessage, listGameRecords, type GameRecordStatus, type GameRecordSummary } from '@/api/adminApi'
import { useAdminLiveRefresh } from '@/api/adminLive'
import DataPanel from '@/components/admin/DataPanel.vue'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import PaginationBar from '@/components/admin/PaginationBar.vue'
import RefreshButton from '@/components/admin/RefreshButton.vue'
import SearchInput from '@/components/admin/SearchInput.vue'
import StatCard from '@/components/admin/StatCard.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { t } from '@/i18n/adminLanguage'
import { formatDate, formatDuration, formatMoney, formatNumber } from '@/lib/format'
import { roundReasonLabel, roundStatusView } from '@/lib/status'

const emit = defineEmits<{
  // Unauthorized loads are surfaced to the shell so it can clear auth and return to login.
  unauthenticated: []
  // Parent shell owns path changes because this admin app uses a lightweight custom router.
  navigate: [path: string]
}>()

const loading = ref(false)
const errorMessage = ref('')
const records = ref<GameRecordSummary[]>([])
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const search = ref('')

// countByStatus counts rounds on the loaded page; the API only returns a total for all rounds.
const countByStatus = (status: GameRecordStatus): number => records.value.filter((record) => record.status === status).length

// filteredRecords narrows the loaded page only; it does not search other pages.
const filteredRecords = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return records.value
  return records.value.filter((record) => {
    const haystack = [
      record.ticket_no,
      record.room_code,
      record.result_reason,
      roundReasonLabel(record.result_reason),
      record.winner_username,
      record.winner_player_id,
      record.status,
    ].join(' ').toLowerCase()
    return haystack.includes(term)
  })
})

// loadGames refreshes the current page. silent is used by live updates: the table stays on screen
// instead of flashing the loading state.
const loadGames = async (silent = false): Promise<void> => {
  errorMessage.value = ''
  if (!silent) loading.value = true
  try {
    const result = await listGameRecords(page.value, perPage.value)
    records.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('records.loadFailed'))
    if (errorMessage.value.includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// openDetail navigates to the dedicated round page without relying on a full browser reload.
const openDetail = (record: GameRecordSummary): void => {
  emit('navigate', `/admin/games/${record.game_round_id}`)
}

// winnerLabel names the winner, or explains why there is none yet.
const winnerLabel = (record: GameRecordSummary): string => {
  if (record.winner_username) return record.winner_username
  if (record.winner_player_id) return t('common.playerFallback', { id: record.winner_player_id })
  if (record.status === 'playing') return t('records.inProgress')
  if (record.status === 'aborted') return t('records.stoppedByAdmin')
  return t('records.noWinner')
}

// Rounds starting, finishing, or being aborted change this list, so reload the current page quietly.
useAdminLiveRefresh(['round_changed'], () => void loadGames(true))

watch([page, perPage], () => {
  void loadGames()
})

onMounted(() => {
  void loadGames()
})
</script>
