import { localeTag } from '@/i18n/adminLanguage'

// Shared display formatters. Every admin page used to carry its own copy of these; keeping one version
// means dates, money, and durations look the same on every screen. They use the admin's chosen language
// (not the browser's), so switching language also switches date and number formats.

// formatDate shows a timestamp in the admin's chosen language, or "-" when there is none.
export function formatDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString(localeTag())
}

// formatMoney shows amounts with exactly two decimals so finance columns line up.
export function formatMoney(value?: number | null): string {
  return Number(value || 0).toLocaleString(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// formatRiel shows an amount with the riel sign in front, the way the game shows balances (៛9,000,000).
// Decimals only appear when the amount has them.
export function formatRiel(value?: number | null): string {
  return `៛${Number(value || 0).toLocaleString(localeTag(), { maximumFractionDigits: 2 })}`
}

// signedMoney prefixes positive amounts with "+" so payout direction is obvious.
export function signedMoney(value?: number | null): string {
  const amount = Number(value || 0)
  return amount > 0 ? `+${formatMoney(amount)}` : formatMoney(amount)
}

// formatNumber shows whole-number counts and limits with thousands separators.
export function formatNumber(value?: number | null): string {
  return Number(value || 0).toLocaleString(localeTag())
}

// formatDuration shows how long something ran, e.g. "3m 20s". Without an end (still running) it returns "-".
export function formatDuration(startedAt?: string | null, endedAt?: string | null): string {
  if (!startedAt || !endedAt) return '-'
  const seconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000))
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}

// formatRelative shows "12 seconds ago" style times for live feeds in the admin's language, and the full
// date for anything older than a day.
export function formatRelative(value?: string | null): string {
  if (!value) return '-'
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds >= 86400) return formatDate(value)
  const relative = new Intl.RelativeTimeFormat(localeTag(), { numeric: 'auto', style: 'short' })
  if (seconds < 60) return relative.format(-Math.max(0, seconds), 'second')
  if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), 'minute')
  return relative.format(-Math.floor(seconds / 3600), 'hour')
}

