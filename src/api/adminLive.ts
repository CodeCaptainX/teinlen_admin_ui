import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import { apiBaseUrl, getStoredToken } from './adminApi'

// AdminEventType mirrors gamecontrol.Event types sent by the member API game server.
export type AdminEventType = 'round_changed' | 'bets_changed'

// AdminEvent is a refresh hint: it says what changed, and pages refetch their own data from the admin API.
// status uses database names: playing/finished/aborted for rounds, held/unsettled/settled/released/
// refund_done/refund_failed for bets.
export interface AdminEvent {
  type: AdminEventType
  parent_room_id: number
  inner_room_id: number
  ticket_no?: string
  status: string
  occurred_at: string
}

// LiveStatus drives the "Live / Reconnecting / Offline" indicator in the shell.
export type LiveStatus = 'idle' | 'connecting' | 'live' | 'offline'

type AdminEventHandler = (event: AdminEvent) => void

// ADMIN_EVENT_TOPIC must match websocket.AdminEventTopic in the admin API.
const ADMIN_EVENT_TOPIC = 'admin_event'
// Reconnect backoff: start fast after a blip, cap so a down server is not hammered.
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 15000

const status = ref<LiveStatus>('idle')
const handlers = new Set<AdminEventHandler>()
let socket: WebSocket | null = null
let reconnectTimer: number | undefined
let reconnectAttempts = 0
// wanted is false after disconnectAdminLive (logout) so a closing socket does not reconnect on its own.
let wanted = false

// adminLiveUrl turns the REST base URL into the admin API WebSocket endpoint (http -> ws, https -> wss).
const adminLiveUrl = (): string => `${apiBaseUrl.replace(/^http/, 'ws')}/api/v1/websocket/ws/`

// connectAdminLive opens the shared admin WebSocket once per signed-in session. Pages do not call it; the
// shell does after login. The JWT goes in the subprotocol ("Bearer", token) because browsers cannot set
// headers on WebSocket requests, and that is the format the admin API middleware expects.
export function connectAdminLive(): void {
  wanted = true
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return
  const token = getStoredToken()
  if (!token) {
    status.value = 'offline'
    return
  }

  status.value = 'connecting'
  const ws = new WebSocket(adminLiveUrl(), ['Bearer', token])
  socket = ws

  ws.onopen = () => {
    reconnectAttempts = 0
    status.value = 'live'
  }
  ws.onmessage = (message) => dispatchAdminMessage(message.data)
  ws.onclose = () => {
    if (socket === ws) socket = null
    if (!wanted) {
      status.value = 'idle'
      return
    }
    status.value = 'offline'
    scheduleReconnect()
  }
  // onclose always follows onerror, so reconnecting is handled there.
  ws.onerror = () => undefined
}

// disconnectAdminLive closes the socket on logout and stops reconnecting.
export function disconnectAdminLive(): void {
  wanted = false
  window.clearTimeout(reconnectTimer)
  reconnectAttempts = 0
  socket?.close()
  socket = null
  status.value = 'idle'
}

// scheduleReconnect retries with exponential backoff while the session still wants a live connection.
function scheduleReconnect(): void {
  window.clearTimeout(reconnectTimer)
  const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** reconnectAttempts)
  reconnectAttempts += 1
  reconnectTimer = window.setTimeout(connectAdminLive, delay)
}

// dispatchAdminMessage hands admin events to the pages listening right now. Other topics on the shared
// socket (and malformed frames) are ignored, because events are only refresh hints.
function dispatchAdminMessage(raw: unknown): void {
  if (typeof raw !== 'string') return
  try {
    const message = JSON.parse(raw) as { topic?: string; data?: AdminEvent }
    if (message.topic !== ADMIN_EVENT_TOPIC || !message.data) return
    for (const handler of handlers) handler(message.data)
  } catch {
    // Ignore frames that are not JSON; the next page load still shows correct data.
  }
}

// useAdminLiveStatus exposes the connection state for indicators.
export function useAdminLiveStatus() {
  return readonly(status)
}

// useAdminLiveRefresh calls refresh when an event of the given types arrives, at most once per debounceMs.
// Settling a round fires several events within a few milliseconds (bets settled, round finished), so the
// debounce turns that burst into one refetch. The listener is removed when the page unmounts.
export function useAdminLiveRefresh(types: AdminEventType[], refresh: () => void, debounceMs = 600): void {
  let timer: number | undefined
  const handler: AdminEventHandler = (event) => {
    if (!types.includes(event.type)) return
    window.clearTimeout(timer)
    timer = window.setTimeout(refresh, debounceMs)
  }
  onMounted(() => handlers.add(handler))
  onBeforeUnmount(() => {
    window.clearTimeout(timer)
    handlers.delete(handler)
  })
}
