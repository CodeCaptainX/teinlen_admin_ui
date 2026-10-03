<template>
  <section class="flex min-h-[calc(100vh-6.5rem)] w-full flex-col">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div class="flex items-center gap-3">
        <div class="admin-icon-tile h-10 w-10">
          <Icon icon="mdi:tools" class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-normal">Maintenance</h1>
          <p class="text-sm text-slate-400">Suspend the website, all games, or one room, and resume when ready</p>
        </div>
      </div>

      <button class="admin-icon-button" title="Refresh" @click="refreshPage">
        <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': loadingActive || loadingHistory }" />
      </button>
    </header>

    <!-- Current status: one tile per level so admins see at a glance what players are blocked from. -->
    <section class="mb-4 grid gap-3 sm:grid-cols-3">
      <div v-for="tile in statusTiles" :key="tile.label" class="admin-panel p-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-400">{{ tile.label }}</span>
          <span class="h-2.5 w-2.5 rounded-full" :class="tile.live ? 'bg-emerald-400' : 'bg-coral'" />
        </div>
        <strong class="text-xl font-black" :class="tile.live ? 'text-emerald-300' : 'text-coral'">{{ tile.value }}</strong>
      </div>
    </section>

    <section class="grid flex-1 gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <form class="admin-panel h-max p-4" @submit.prevent="openConfirm">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="font-black">Suspend</h2>
            <p class="text-sm text-slate-400">Players see your message until you resume</p>
          </div>
          <Icon icon="mdi:pause-octagon" class="h-5 w-5 text-coral" />
        </div>

        <fieldset class="mb-4 grid gap-2">
          <legend class="mb-1 text-sm font-bold text-slate-300">Level</legend>
          <label v-for="scope in scopes" :key="scope.code" class="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm" :class="form.scope === scope.code ? 'border-gold bg-gold/10' : 'border-white/10 bg-ink-800'">
            <input v-model="form.scope" type="radio" :value="scope.code" class="accent-gold" />
            <span class="font-bold">{{ scope.name }}</span>
            <span class="ml-auto text-xs text-slate-500">{{ scopeHint(scope.code) }}</span>
          </label>
        </fieldset>

        <label v-if="selectedScopeRequiresRoom" class="mb-4 grid gap-1 text-sm font-bold text-slate-300">
          Room
          <select v-model.number="form.roomId" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm text-slate-100 outline-none">
            <option :value="0" disabled>Select a room</option>
            <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.code }} · {{ room.name }}</option>
          </select>
        </label>

        <fieldset class="mb-4 grid gap-2">
          <legend class="mb-1 text-sm font-bold text-slate-300">Rounds already playing</legend>
          <label class="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm" :class="form.policy === 'drain' ? 'border-gold bg-gold/10' : 'border-white/10 bg-ink-800'">
            <input v-model="form.policy" type="radio" value="drain" class="mt-1 accent-gold" />
            <span>
              <span class="block font-bold">Let them finish</span>
              <span class="text-xs text-slate-400">Running rounds settle normally; no new round starts.</span>
            </span>
          </label>
          <label class="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm" :class="form.policy === 'force_stop' ? 'border-coral bg-coral/10' : 'border-white/10 bg-ink-800'">
            <input v-model="form.policy" type="radio" value="force_stop" class="mt-1 accent-coral" />
            <span>
              <span class="block font-bold">Force stop + refund all</span>
              <span class="text-xs text-slate-400">Running rounds end now and every held bet is refunded.</span>
            </span>
          </label>
        </fieldset>

        <label class="mb-4 grid gap-1 text-sm font-bold text-slate-300">
          Message to players
          <input v-model="form.message" maxlength="255" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2" placeholder="Upgrading server" />
        </label>

        <label class="mb-5 grid gap-1 text-sm font-bold text-slate-300">
          Expected back (optional)
          <input v-model="form.expectedBackAt" type="datetime-local" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2" />
        </label>

        <button class="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-coral px-4 text-sm font-black text-ink-950 disabled:opacity-60" :disabled="submitting || !formIsValid">
          <Icon icon="mdi:pause-octagon" class="h-5 w-5" />
          Suspend
        </button>
      </form>

      <div class="grid h-max gap-4">
        <div class="admin-panel overflow-hidden">
          <div class="border-b border-white/10 px-4 py-3">
            <h2 class="font-black">Active now</h2>
          </div>
          <div v-if="activeRecords.length === 0" class="p-4 text-sm text-slate-400">Everything is live.</div>
          <div v-else class="grid gap-2 p-3">
            <div v-for="record in activeRecords" :key="record.id" class="flex flex-wrap items-center gap-3 rounded-md border border-coral/30 bg-coral/5 p-3">
              <div class="min-w-48 flex-1">
                <strong class="block">{{ suspensionTarget(record) }}</strong>
                <span class="text-xs text-slate-400">
                  {{ policyLabel(record.running_round_policy) }} · by {{ record.started_by_name || `#${record.started_by}` }} · {{ formatDate(record.started_at) }}
                </span>
                <span v-if="record.message" class="mt-1 block text-sm text-slate-200">“{{ record.message }}”</span>
                <span v-if="record.expected_back_at" class="block text-xs text-gold">Expected back {{ formatDate(record.expected_back_at) }}</span>
              </div>
              <button class="flex h-9 items-center gap-2 rounded-md bg-emerald-400 px-3 text-xs font-black text-ink-950 disabled:opacity-60" :disabled="resumingId === record.id" @click="resume(record)">
                <Icon :icon="resumingId === record.id ? 'mdi:loading' : 'mdi:play'" class="h-4 w-4" :class="{ 'animate-spin': resumingId === record.id }" />
                Resume
              </button>
            </div>
          </div>
        </div>

        <div class="admin-panel overflow-hidden">
          <div class="border-b border-white/10 px-4 py-3">
            <h2 class="font-black">History</h2>
          </div>
          <div v-if="loadingHistory && history.length === 0" class="grid h-40 place-items-center text-slate-400">
            <Icon icon="mdi:loading" class="h-6 w-6 animate-spin text-gold" />
          </div>
          <div v-else-if="history.length === 0" class="p-4 text-sm text-slate-400">No suspensions yet.</div>
          <div v-else class="overflow-auto">
            <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead class="bg-ink-800 text-xs uppercase text-slate-400">
                <tr>
                  <th class="px-4 py-3 font-black">Level</th>
                  <th class="px-4 py-3 font-black">Running rounds</th>
                  <th class="px-4 py-3 font-black">Message</th>
                  <th class="px-4 py-3 font-black">Started</th>
                  <th class="px-4 py-3 font-black">Ended</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in history" :key="record.id" class="border-t border-white/10">
                  <td class="px-4 py-3 font-bold">{{ suspensionTarget(record) }}</td>
                  <td class="px-4 py-3">{{ policyLabel(record.running_round_policy) }}</td>
                  <td class="max-w-xs px-4 py-3 text-slate-300">{{ record.message || '-' }}</td>
                  <td class="px-4 py-3 text-slate-300">
                    {{ formatDate(record.started_at) }}
                    <span class="block text-xs text-slate-500">{{ record.started_by_name || `#${record.started_by}` }}</span>
                  </td>
                  <td class="px-4 py-3 text-slate-300">
                    <span v-if="record.status === 'active'" class="rounded bg-coral/15 px-2 py-1 text-xs font-black text-coral">Active</span>
                    <template v-else>
                      {{ formatDate(record.ended_at) }}
                      <span class="block text-xs text-slate-500">{{ record.ended_by_name || `#${record.ended_by}` }}</span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer class="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm text-slate-400">
            <span>Page {{ historyPage }} · {{ historyTotal }} total</span>
            <div class="flex gap-2">
              <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="historyPage <= 1" @click="historyPage--">Previous</button>
              <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="historyPage >= historyTotalPages" @click="historyPage++">Next</button>
            </div>
          </footer>
        </div>
      </div>
    </section>

    <p v-if="errorMessage" class="mt-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{{ errorMessage }}</p>
    <p v-if="successMessage" class="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{{ successMessage }}</p>

    <!-- Confirm step: suspending blocks real players (and force stop moves money), so it is never one click. -->
    <div v-if="confirmOpen" class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" @click.self="confirmOpen = false">
      <div class="admin-panel w-full max-w-md p-5">
        <div class="mb-3 flex items-center gap-3">
          <Icon icon="mdi:alert" class="h-6 w-6 text-coral" />
          <h2 class="font-black">Confirm suspend</h2>
        </div>
        <p class="mb-2 text-sm text-slate-200">You are about to suspend <strong>{{ confirmTargetLabel }}</strong>.</p>
        <p class="mb-4 text-sm" :class="form.policy === 'force_stop' ? 'text-coral' : 'text-slate-400'">{{ confirmPolicyText }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="h-10 rounded-md border border-white/10 bg-ink-900 px-4 text-sm font-black text-slate-100 hover:bg-ink-700" @click="confirmOpen = false">Cancel</button>
          <button class="flex h-10 items-center gap-2 rounded-md bg-coral px-4 text-sm font-black text-ink-950 disabled:opacity-60" :disabled="submitting" @click="submitSuspension">
            <Icon :icon="submitting ? 'mdi:loading' : 'mdi:pause-octagon'" class="h-4 w-4" :class="{ 'animate-spin': submitting }" />
            Confirm suspend
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  apiErrorMessage,
  endSuspension,
  listActiveSuspensions,
  listRooms,
  listSuspensionHistory,
  startSuspension,
  type GameSuspension,
  type Room,
  type RunningRoundPolicy,
  type SuspensionScope,
  type SuspensionScopeOption,
} from '../api/adminApi'

// SuspensionsPage lets admins put the member website, all games, or one room into maintenance and resume
// it later. The admin API saves each action and the game server applies it within a second (or ~30s if
// the pub/sub notification is missed), so the page reloads from the API after every change.

const emit = defineEmits<{
  // Unauthorized loads are surfaced to the shell so it can clear auth and return to login.
  unauthenticated: []
}>()

// HISTORY_PER_PAGE keeps the history table short next to the form.
const HISTORY_PER_PAGE = 10

const loadingActive = ref(false)
const loadingHistory = ref(false)
const submitting = ref(false)
const resumingId = ref(0)
const confirmOpen = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const activeRecords = ref<GameSuspension[]>([])
const scopes = ref<SuspensionScopeOption[]>([])
const rooms = ref<Room[]>([])
const history = ref<GameSuspension[]>([])
const historyPage = ref(1)
const historyTotal = ref(0)

// form holds the suspend form. roomId 0 means "no room selected" for the room scope.
const form = reactive({
  scope: 'all_games' as SuspensionScope,
  roomId: 0,
  policy: 'drain' as RunningRoundPolicy,
  message: '',
  expectedBackAt: '',
})

const historyTotalPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / HISTORY_PER_PAGE)))

const selectedScopeRequiresRoom = computed(() => scopes.value.find((scope) => scope.code === form.scope)?.requires_room ?? false)

// formIsValid mirrors the backend rules so the Suspend button is disabled instead of failing after submit.
const formIsValid = computed(() => {
  if (selectedScopeRequiresRoom.value && form.roomId <= 0) return false
  if (form.expectedBackAt && new Date(form.expectedBackAt).getTime() <= Date.now()) return false
  return true
})

// statusTiles summarizes the three levels players can be blocked at.
const statusTiles = computed(() => {
  const site = activeRecords.value.find((record) => record.scope === 'site')
  const allGames = activeRecords.value.find((record) => record.scope === 'all_games')
  const roomCount = activeRecords.value.filter((record) => record.scope === 'room').length
  return [
    { label: 'Website', value: site ? 'Maintenance' : 'Live', live: !site },
    { label: 'All games', value: allGames ? 'Paused' : 'Live', live: !allGames },
    { label: 'Rooms paused', value: roomCount === 0 ? 'None' : `${roomCount} room${roomCount === 1 ? '' : 's'}`, live: roomCount === 0 },
  ]
})

const confirmTargetLabel = computed(() => {
  if (form.scope === 'room') {
    const room = rooms.value.find((item) => item.id === form.roomId)
    return room ? `room ${room.code}` : 'the selected room'
  }
  return form.scope === 'site' ? 'the whole website' : 'all games'
})

const confirmPolicyText = computed(() =>
  form.policy === 'force_stop'
    ? 'Rounds being played right now will stop immediately and every held bet will be refunded.'
    : 'Rounds being played right now will finish and settle normally. No new round will start.',
)

// loadActive refreshes the current suspensions and the scope options.
const loadActive = async (): Promise<void> => {
  loadingActive.value = true
  try {
    const result = await listActiveSuspensions()
    activeRecords.value = result.records
    scopes.value = result.scopes
  } catch (error) {
    handleLoadError(error, 'Unable to load active suspensions')
  } finally {
    loadingActive.value = false
  }
}

// loadHistory refreshes the current history page.
const loadHistory = async (): Promise<void> => {
  loadingHistory.value = true
  try {
    const result = await listSuspensionHistory(historyPage.value, HISTORY_PER_PAGE)
    history.value = result.records
    historyTotal.value = result.total
  } catch (error) {
    handleLoadError(error, 'Unable to load suspension history')
  } finally {
    loadingHistory.value = false
  }
}

// loadRooms fetches parent rooms for the room picker.
const loadRooms = async (): Promise<void> => {
  try {
    rooms.value = await listRooms()
  } catch (error) {
    handleLoadError(error, 'Unable to load rooms')
  }
}

// refreshPage reloads everything shown on the page.
const refreshPage = async (): Promise<void> => {
  await Promise.all([loadActive(), loadHistory(), loadRooms()])
}

// handleLoadError shows the backend reason and hands expired sessions back to the shell.
const handleLoadError = (error: unknown, fallback: string): void => {
  errorMessage.value = apiErrorMessage(error, fallback)
  if (errorMessage.value.includes('401')) emit('unauthenticated')
}

// openConfirm shows the confirm dialog; nothing is sent until the admin confirms.
const openConfirm = (): void => {
  if (!formIsValid.value) return
  errorMessage.value = ''
  successMessage.value = ''
  confirmOpen.value = true
}

// submitSuspension sends the confirmed suspension, then reloads the page from the API.
const submitSuspension = async (): Promise<void> => {
  submitting.value = true
  errorMessage.value = ''
  try {
    const result = await startSuspension({
      scope: form.scope,
      room_id: form.scope === 'room' ? form.roomId : undefined,
      running_round_policy: form.policy,
      message: form.message.trim(),
      // datetime-local has no timezone; toISOString sends the admin's local time as an absolute instant.
      expected_back_at: form.expectedBackAt ? new Date(form.expectedBackAt).toISOString() : undefined,
    })
    confirmOpen.value = false
    successMessage.value = result.commandWarning || `Suspended ${suspensionTarget(result.record)}`
    form.message = ''
    form.expectedBackAt = ''
    await Promise.all([loadActive(), loadHistory()])
  } catch (error) {
    confirmOpen.value = false
    handleLoadError(error, 'Unable to suspend')
  } finally {
    submitting.value = false
  }
}

// resume ends one active suspension. The game server restarts countdowns in tables that have players.
const resume = async (record: GameSuspension): Promise<void> => {
  if (!window.confirm(`Resume ${suspensionTarget(record)}?`)) return
  resumingId.value = record.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await endSuspension(record.id, '')
    successMessage.value = result.commandWarning || `Resumed ${suspensionTarget(record)}`
    await Promise.all([loadActive(), loadHistory()])
  } catch (error) {
    handleLoadError(error, 'Unable to resume')
  } finally {
    resumingId.value = 0
  }
}

// suspensionTarget names what a suspension covers in plain words.
const suspensionTarget = (record: GameSuspension): string => {
  if (record.scope === 'room') return `Room ${record.room_code || `#${record.room_id}`}`
  return record.scope === 'site' ? 'Whole website' : 'All games'
}

// scopeHint explains each level next to its radio button.
const scopeHint = (scope: SuspensionScope): string => {
  if (scope === 'site') return 'Maintenance page, no login'
  if (scope === 'all_games') return 'Lobby open, no games'
  return 'One room paused'
}

// policyLabel turns the stored policy into the wording used on the form.
const policyLabel = (policy: RunningRoundPolicy): string => (policy === 'force_stop' ? 'Force stop + refund' : 'Let finish')

// formatDate shows timestamps in the admin's local time.
const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

watch(historyPage, () => {
  void loadHistory()
})

onMounted(() => {
  void refreshPage()
})
</script>
