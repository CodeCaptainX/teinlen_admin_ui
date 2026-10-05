import { t } from '@/i18n/adminLanguage'

// Domain status → label and badge tone. Pages use these instead of their own if/else chains so the same
// state (for example a `held` bet) always reads and looks the same wherever it appears. Labels go through
// t() so they follow the admin's language; unknown values from the API are shown as stored.

// StatusTone picks the badge color: success = done/good, warning = waiting or money still held,
// info = in progress, danger = failed/stopped, neutral = closed with no money effect.
export type StatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

export interface StatusView {
  label: string
  tone: StatusTone
}

// roundStatusView describes tbl_game_round_summaries.status.
export function roundStatusView(status: string): StatusView {
  if (status === 'playing') return { label: t('status.round.playing'), tone: 'info' }
  if (status === 'finished') return { label: t('status.round.finished'), tone: 'success' }
  if (status === 'aborted') return { label: t('status.round.aborted'), tone: 'danger' }
  return { label: status || '-', tone: 'neutral' }
}

// betStatusView describes tbl_game_round_bets.status. `held` is money taken before the round starts and
// `unsettled` is money in a round that is being played; both can still be refunded.
export function betStatusView(status: string): StatusView {
  if (status === 'held') return { label: t('status.bet.held'), tone: 'warning' }
  if (status === 'unsettled') return { label: t('status.bet.unsettled'), tone: 'info' }
  if (status === 'settled') return { label: t('status.bet.settled'), tone: 'success' }
  if (status === 'released') return { label: t('status.bet.released'), tone: 'neutral' }
  if (status === 'failed') return { label: t('status.bet.failed'), tone: 'danger' }
  return { label: status || '-', tone: 'neutral' }
}

// refundStatusView describes tbl_game_bet_refund_requests.status.
export function refundStatusView(status: string): StatusView {
  if (status === 'pending') return { label: t('status.refund.pending'), tone: 'warning' }
  if (status === 'done') return { label: t('status.refund.done'), tone: 'success' }
  if (status === 'failed') return { label: t('status.refund.failed'), tone: 'danger' }
  return { label: status || '-', tone: 'neutral' }
}

// activeStatusView describes simple active/inactive records (rooms, members, admin users, payout rules).
// pausedWording uses "Paused" instead of "Inactive" for rules that are switched off temporarily.
export function activeStatusView(active: boolean, pausedWording = false): StatusView {
  if (active) return { label: t('status.active'), tone: 'success' }
  return { label: pausedWording ? t('status.paused') : t('status.inactive'), tone: 'neutral' }
}

// outcomeView colors a player's round result: won green, lost red, ranked gold.
export function outcomeView(outcome = ''): StatusView {
  if (outcome === 'won') return { label: t('status.result.won'), tone: 'success' }
  if (outcome === 'lost') return { label: t('status.result.lost'), tone: 'danger' }
  if (outcome === 'ranked') return { label: t('status.result.ranked'), tone: 'warning' }
  return { label: outcome || '-', tone: 'neutral' }
}

// roundReasonLabel turns stored round/player finish reasons into plain words without hiding unknown values.
export function roundReasonLabel(reason = ''): string {
  if (reason === 'left_mid_game' || reason === 'player_left') return t('reason.round.playerLeft')
  if (reason === 'offline_mid_game' || reason === 'player_offline') return t('reason.round.playerOffline')
  if (reason === 'round_finished') return t('reason.round.normalFinish')
  if (reason === 'empty_hand') return t('reason.round.playedAllCards')
  if (reason === 'auto_win') return t('reason.round.autoWin')
  return reason || '-'
}

// betReasonLabel explains why a bet changed state (stored in tbl_game_round_bets.reason).
export function betReasonLabel(reason = ''): string {
  if (reason === 'game_start_hold') return t('reason.bet.heldAtCountdown')
  if (reason === 'round_started') return t('reason.bet.roundStarted')
  if (reason === 'round_finished') return t('reason.bet.roundFinished')
  if (reason === 'admin_force_stop') return t('reason.bet.adminForceStop')
  if (reason === 'admin_refund') return t('reason.bet.adminRefund')
  if (reason === 'no_winner') return t('reason.bet.noWinner')
  if (reason === 'ready_cancelled' || reason === 'player_not_ready') return t('reason.bet.playerNotReady')
  if (reason === 'deal_failed' || reason === 'ready_countdown_failed') return t('reason.bet.roundFailedToStart')
  return reason ? reason.replace(/_/g, ' ') : '-'
}

// betResultLabel describes tbl_game_round_bets.result for settled/released bets; empty while unsettled.
export function betResultLabel(result = ''): string {
  if (result === 'win') return t('status.result.won')
  if (result === 'lose') return t('status.result.lost')
  if (result === 'ranked') return t('status.result.ranked')
  if (result === 'refund') return t('status.result.refunded')
  if (result === 'unsettled' || !result) return ''
  return result
}
