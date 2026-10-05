<template>
  <div class="grid gap-4">
    <PageHeader :title="t('dashboard.title')" :description="t('dashboard.description')">
      <template #actions>
        <RefreshButton :loading="loading" @click="loadOverview()" />
      </template>
    </PageHeader>

    <ErrorAlert :message="errorMessage" />

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard :label="t('dashboard.playingNow')" :value="formatNumber(summary?.playing_rounds)" :hint="t('dashboard.playingNowHint')" :icon="ActivityIcon" :loading="!summary" />
      <StatCard :label="t('dashboard.roundsToday')" :value="formatNumber(summary?.rounds_today)" :hint="t('dashboard.roundsTodayHint')" :icon="SpadeIcon" :loading="!summary" />
      <StatCard
        :label="t('dashboard.moneyHeld')"
        :value="formatMoney(summary?.held_amount)"
        :hint="t('dashboard.moneyHeldHint', { count: formatNumber(summary?.held_bets) })"
        :icon="WalletIcon"
        :loading="!summary"
      />
      <StatCard
        :label="t('dashboard.pendingRefunds')"
        :value="formatNumber(summary?.pending_refunds)"
        :hint="t('dashboard.pendingRefundsHint')"
        :icon="Undo2Icon"
        :loading="!summary"
        :highlight="(summary?.pending_refunds || 0) > 0"
      />
      <StatCard
        :label="t('dashboard.suspensions')"
        :value="formatNumber(summary?.active_suspensions)"
        :hint="(summary?.active_suspensions || 0) > 0 ? t('dashboard.suspensionsBlocked') : t('dashboard.suspensionsLive')"
        :icon="WrenchIcon"
        :loading="!summary"
        :highlight="(summary?.active_suspensions || 0) > 0"
      />
    </section>

    <div class="grid gap-4 xl:grid-cols-2">
      <DataPanel :title="t('dashboard.recentRounds')" size="compact" :loading="loading" :empty="recentRounds.length === 0" :empty-title="t('dashboard.noRounds')" :empty-icon="SpadeIcon">
        <template #actions>
          <Button variant="ghost" size="sm" @click="emit('navigate', '/admin/games')">
            {{ t('common.viewAll') }}
            <ArrowRightIcon />
          </Button>
        </template>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('col.ticket') }}</TableHead>
              <TableHead>{{ t('col.status') }}</TableHead>
              <TableHead>{{ t('col.winner') }}</TableHead>
              <TableHead>{{ t('col.started') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="round in recentRounds" :key="round.game_round_id" class="cursor-pointer" @click="emit('navigate', `/admin/games/${round.game_round_id}`)">
              <TableCell class="font-mono text-xs text-primary">{{ round.ticket_no || '-' }}</TableCell>
              <TableCell><StatusBadge :view="roundStatusView(round.status)" :pulse="round.status === 'playing'" /></TableCell>
              <TableCell>{{ round.winner_username || (round.status === 'playing' ? t('dashboard.inProgress') : '-') }}</TableCell>
              <TableCell class="text-muted-foreground">{{ formatRelative(round.started_at) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DataPanel>

      <DataPanel :title="t('dashboard.recentBets')" size="compact" :loading="loading" :empty="recentBets.length === 0" :empty-title="t('dashboard.noBets')" :empty-icon="WalletIcon">
        <template #actions>
          <Button variant="ghost" size="sm" @click="emit('navigate', '/admin/game-bets')">
            {{ t('common.viewAll') }}
            <ArrowRightIcon />
          </Button>
        </template>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('col.member') }}</TableHead>
              <TableHead class="text-right">{{ t('col.amount') }}</TableHead>
              <TableHead>{{ t('col.status') }}</TableHead>
              <TableHead>{{ t('col.created') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="bet in recentBets" :key="bet.id">
              <TableCell class="font-medium">#{{ bet.member_id }}</TableCell>
              <TableCell class="text-right font-mono tabular-nums">{{ formatMoney(bet.amount) }}</TableCell>
              <TableCell><StatusBadge :view="betStatusView(bet.status)" /></TableCell>
              <TableCell class="text-muted-foreground">{{ formatRelative(bet.created_at) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DataPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ActivityIcon, ArrowRightIcon, SpadeIcon, Undo2Icon, WalletIcon, WrenchIcon } from '@lucide/vue'
import {
  apiErrorMessage,
  getDashboardSummary,
  listGameRecords,
  listGameRoundBets,
  type DashboardSummary,
  type GameRecordSummary,
  type GameRoundBet,
} from '@/api/adminApi'
import { useAdminLiveRefresh } from '@/api/adminLive'
import DataPanel from '@/components/admin/DataPanel.vue'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import RefreshButton from '@/components/admin/RefreshButton.vue'
import StatCard from '@/components/admin/StatCard.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { t } from '@/i18n/adminLanguage'
import { formatMoney, formatNumber, formatRelative } from '@/lib/format'
import { betStatusView, roundStatusView } from '@/lib/status'

const emit = defineEmits<{
  // Navigation is emitted to the shell so browser history remains centralized in App.vue.
  navigate: [path: string]
  // Unauthorized overview loads are handled by the shell to clear stale stored tokens.
  unauthenticated: []
}>()

// RECENT_ROWS keeps the two dashboard tables short; the full lists are one click away.
const RECENT_ROWS = 8

const loading = ref(false)
const errorMessage = ref('')
const summary = ref<DashboardSummary | null>(null)
const recentRounds = ref<GameRecordSummary[]>([])
const recentBets = ref<GameRoundBet[]>([])

// loadOverview fetches the counters and both recent lists in parallel. silent is used by live updates so
// the tables stay on screen instead of flashing their loading state.
const loadOverview = async (silent = false): Promise<void> => {
  errorMessage.value = ''
  if (!silent) loading.value = true
  try {
    const [nextSummary, rounds, bets] = await Promise.all([
      getDashboardSummary(),
      listGameRecords(1, RECENT_ROWS),
      listGameRoundBets(1, RECENT_ROWS),
    ])
    summary.value = nextSummary
    recentRounds.value = rounds.records
    recentBets.value = bets.records
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('dashboard.loadFailed'))
    if (errorMessage.value.includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// Every round or bet change moves a counter here, so both event types refresh the dashboard quietly.
useAdminLiveRefresh(['round_changed', 'bets_changed'], () => void loadOverview(true))

onMounted(() => {
  void loadOverview()
})
</script>
