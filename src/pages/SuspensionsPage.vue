<template>
  <div class="grid gap-4">
    <PageHeader :title="t('maintenance.title')" :description="t('maintenance.description')">
      <template #actions>
        <RefreshButton :loading="loadingActive || loadingHistory" @click="refreshPage" />
        <Button variant="destructive" @click="openSuspendDialog">
          <CirclePauseIcon />
          {{ t('maintenance.suspend') }}
        </Button>
      </template>
    </PageHeader>

    <ErrorAlert :message="errorMessage" />

    <!-- Current status: one tile per level so admins see at a glance what players are blocked from. -->
    <section class="grid gap-3 sm:grid-cols-3">
      <div v-for="tile in statusTiles" :key="tile.label" class="rounded-xl border bg-card p-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ tile.label }}</span>
          <span class="size-2.5 rounded-full" :class="tile.live ? 'bg-success' : 'bg-destructive'" />
        </div>
        <p class="mt-2 text-xl font-semibold" :class="tile.live ? 'text-success' : 'text-destructive'">{{ tile.value }}</p>
      </div>
    </section>

    <div class="grid gap-4 xl:grid-cols-2">
      <SectionCard :title="t('maintenance.activeNow')" class="h-max">
        <p v-if="activeRecords.length === 0" class="text-sm text-muted-foreground">{{ t('maintenance.everythingLive') }}</p>
        <div v-else class="grid gap-2">
          <div v-for="record in activeRecords" :key="record.id" class="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div class="min-w-48 flex-1">
              <strong class="block font-medium">{{ suspensionTarget(record) }}</strong>
              <span class="text-xs text-muted-foreground">
                {{ t('maintenance.byLine', { policy: policyLabel(record.running_round_policy), name: record.started_by_name || `#${record.started_by}`, date: formatDate(record.started_at) }) }}
              </span>
              <span v-if="record.message" class="mt-1 block text-sm">“{{ record.message }}”</span>
              <span v-if="record.expected_back_at" class="block text-xs text-warning">{{ t('maintenance.expectedBack', { date: formatDate(record.expected_back_at) }) }}</span>
            </div>
            <Button size="sm" class="bg-success text-primary-foreground hover:bg-success/90" :disabled="resumingId === record.id" @click="resumeTarget = record">
              <Loader2Icon v-if="resumingId === record.id" class="animate-spin" />
              <PlayIcon v-else />
              {{ t('maintenance.resume') }}
            </Button>
          </div>
        </div>
      </SectionCard>

      <DataPanel :title="t('maintenance.history')" size="compact" :loading="loadingHistory && history.length === 0" :empty="history.length === 0" :empty-title="t('maintenance.noSuspensions')" :empty-icon="WrenchIcon">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('col.level') }}</TableHead>
              <TableHead>{{ t('col.runningRounds') }}</TableHead>
              <TableHead>{{ t('col.message') }}</TableHead>
              <TableHead>{{ t('col.started') }}</TableHead>
              <TableHead>{{ t('col.ended') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="record in history" :key="record.id">
              <TableCell class="font-medium">{{ suspensionTarget(record) }}</TableCell>
              <TableCell>{{ policyLabel(record.running_round_policy) }}</TableCell>
              <TableCell class="max-w-xs whitespace-normal text-muted-foreground">{{ record.message || '-' }}</TableCell>
              <TableCell class="text-muted-foreground">
                {{ formatDate(record.started_at) }}
                <span class="block text-xs">{{ record.started_by_name || `#${record.started_by}` }}</span>
              </TableCell>
              <TableCell class="text-muted-foreground">
                <StatusBadge v-if="record.status === 'active'" :view="{ label: t('maintenance.activeBadge'), tone: 'danger' }" />
                <template v-else>
                  {{ formatDate(record.ended_at) }}
                  <span class="block text-xs">{{ record.ended_by_name || `#${record.ended_by}` }}</span>
                </template>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <template #footer>
          <PaginationBar v-model:page="historyPage" :total="historyTotal" :per-page="HISTORY_PER_PAGE" :item-label="t('items.suspensions')" hide-per-page />
        </template>
      </DataPanel>
    </div>

    <!--
      Suspend dialog, two steps: fill the form, then confirm. Suspending blocks real players (and force stop
      moves money), so it is never one click.
    -->
    <Dialog v-model:open="suspendOpen">
      <DialogContent class="bg-card sm:max-w-lg">
        <template v-if="!confirmOpen">
          <DialogHeader>
            <DialogTitle>{{ t('maintenance.dialog.title') }}</DialogTitle>
            <DialogDescription>{{ t('maintenance.dialog.desc') }}</DialogDescription>
          </DialogHeader>

          <form id="suspend-form" class="grid gap-4" @submit.prevent="openConfirm">
            <fieldset class="grid gap-2">
              <legend class="mb-1 text-xs font-medium text-muted-foreground">{{ t('maintenance.dialog.level') }}</legend>
              <label v-for="scope in scopes" :key="scope.code" class="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm" :class="form.scope === scope.code ? 'border-primary bg-primary/10' : 'bg-muted'">
                <input v-model="form.scope" type="radio" :value="scope.code" class="accent-primary" />
                <span class="font-medium">{{ scope.name }}</span>
                <span class="ml-auto text-xs text-muted-foreground">{{ scopeHint(scope.code) }}</span>
              </label>
            </fieldset>

            <FormField v-if="selectedScopeRequiresRoom" id="suspend-room" :label="t('maintenance.dialog.room')">
              <NativeSelect id="suspend-room" v-model.number="form.roomId" class="w-full">
                <NativeSelectOption :value="0" disabled>{{ t('maintenance.dialog.selectRoom') }}</NativeSelectOption>
                <NativeSelectOption v-for="room in rooms" :key="room.id" :value="room.id">{{ room.code }} · {{ room.name }}</NativeSelectOption>
              </NativeSelect>
            </FormField>

            <fieldset class="grid gap-2">
              <legend class="mb-1 text-xs font-medium text-muted-foreground">{{ t('maintenance.dialog.runningRounds') }}</legend>
              <label class="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm" :class="form.policy === 'drain' ? 'border-primary bg-primary/10' : 'bg-muted'">
                <input v-model="form.policy" type="radio" value="drain" class="mt-1 accent-primary" />
                <span>
                  <span class="block font-medium">{{ t('maintenance.dialog.letFinish') }}</span>
                  <span class="text-xs text-muted-foreground">{{ t('maintenance.dialog.letFinishDesc') }}</span>
                </span>
              </label>
              <label class="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm" :class="form.policy === 'force_stop' ? 'border-destructive bg-destructive/10' : 'bg-muted'">
                <input v-model="form.policy" type="radio" value="force_stop" class="mt-1 accent-destructive" />
                <span>
                  <span class="block font-medium">{{ t('maintenance.dialog.forceStop') }}</span>
                  <span class="text-xs text-muted-foreground">{{ t('maintenance.dialog.forceStopDesc') }}</span>
                </span>
              </label>
            </fieldset>

            <FormField id="suspend-message" :label="t('maintenance.dialog.message')">
              <Input id="suspend-message" v-model="form.message" maxlength="255" :placeholder="t('maintenance.dialog.messagePlaceholder')" />
            </FormField>
            <FormField id="suspend-back" :label="t('maintenance.dialog.expectedBack')" :hint="t('maintenance.dialog.expectedBackHint')">
              <Input id="suspend-back" v-model="form.expectedBackAt" type="datetime-local" />
            </FormField>
          </form>

          <DialogFooter>
            <Button variant="outline" @click="suspendOpen = false">{{ t('common.cancel') }}</Button>
            <Button type="submit" form="suspend-form" variant="destructive" :disabled="!formIsValid">{{ t('common.continue') }}</Button>
          </DialogFooter>
        </template>

        <template v-else>
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <TriangleAlertIcon class="size-5 text-destructive" />
              {{ t('maintenance.confirm.title') }}
            </DialogTitle>
            <DialogDescription>{{ t('maintenance.confirm.lead', { target: confirmTargetLabel }) }}</DialogDescription>
          </DialogHeader>
          <p class="text-sm" :class="form.policy === 'force_stop' ? 'text-destructive' : 'text-muted-foreground'">{{ confirmPolicyText }}</p>
          <DialogFooter>
            <Button variant="outline" :disabled="submitting" @click="confirmOpen = false">{{ t('common.back') }}</Button>
            <Button variant="destructive" :disabled="submitting" @click="submitSuspension">
              <Loader2Icon v-if="submitting" class="animate-spin" />
              {{ t('maintenance.confirm.submit') }}
            </Button>
          </DialogFooter>
        </template>
      </DialogContent>
    </Dialog>

    <!-- Resume confirmation: resuming lets players back in, so it is confirmed like suspending. -->
    <Dialog :open="Boolean(resumeTarget)" @update:open="(open) => { if (!open) resumeTarget = null }">
      <DialogContent class="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('maintenance.resumeDialog.title', { target: resumeTarget ? suspensionTarget(resumeTarget) : '' }) }}</DialogTitle>
          <DialogDescription>{{ t('maintenance.resumeDialog.desc') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="resumeTarget = null">{{ t('common.cancel') }}</Button>
          <Button class="bg-success text-primary-foreground hover:bg-success/90" @click="resume">
            <PlayIcon />
            {{ t('maintenance.resume') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { CirclePauseIcon, Loader2Icon, PlayIcon, TriangleAlertIcon, WrenchIcon } from '@lucide/vue'
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
} from '@/api/adminApi'
import DataPanel from '@/components/admin/DataPanel.vue'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import FormField from '@/components/admin/FormField.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import PaginationBar from '@/components/admin/PaginationBar.vue'
import RefreshButton from '@/components/admin/RefreshButton.vue'
import SectionCard from '@/components/admin/SectionCard.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { t } from '@/i18n/adminLanguage'
import { formatDate } from '@/lib/format'

// SuspensionsPage lets admins put the member website, all games, or one room into maintenance and resume
// it later. The admin API saves each action and the game server applies it within a second (or ~30s if
// the pub/sub notification is missed), so the page reloads from the API after every change.

const emit = defineEmits<{
  // Unauthorized loads are surfaced to the shell so it can clear auth and return to login.
  unauthenticated: []
}>()

// HISTORY_PER_PAGE keeps the history table short next to the active list.
const HISTORY_PER_PAGE = 10

const loadingActive = ref(false)
const loadingHistory = ref(false)
const submitting = ref(false)
const resumingId = ref(0)
// suspendOpen shows the Suspend dialog; confirmOpen switches it from the form step to the confirm step.
const suspendOpen = ref(false)
const confirmOpen = ref(false)
// resumeTarget is the suspension waiting for resume confirmation; null means the dialog is closed.
const resumeTarget = ref<GameSuspension | null>(null)
const errorMessage = ref('')
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

const selectedScopeRequiresRoom = computed(() => scopes.value.find((scope) => scope.code === form.scope)?.requires_room ?? false)

// formIsValid mirrors the backend rules so Continue is disabled instead of failing after submit.
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
    { label: t('maintenance.tile.website'), value: site ? t('maintenance.value.maintenance') : t('maintenance.value.live'), live: !site },
    { label: t('maintenance.tile.allGames'), value: allGames ? t('maintenance.value.paused') : t('maintenance.value.live'), live: !allGames },
    {
      label: t('maintenance.tile.roomsPaused'),
      value: roomCount === 0 ? t('maintenance.value.none') : t('maintenance.value.roomCount', { count: roomCount }),
      live: roomCount === 0,
    },
  ]
})

const confirmTargetLabel = computed(() => {
  if (form.scope === 'room') {
    const room = rooms.value.find((item) => item.id === form.roomId)
    return room ? t('maintenance.confirm.targetRoom', { code: room.code }) : t('maintenance.confirm.targetSelectedRoom')
  }
  return form.scope === 'site' ? t('maintenance.confirm.targetSite') : t('maintenance.confirm.targetAllGames')
})

const confirmPolicyText = computed(() =>
  form.policy === 'force_stop'
    ? t('maintenance.confirm.forceStop')
    : t('maintenance.confirm.drain'),
)

// loadActive refreshes the current suspensions and the scope options.
const loadActive = async (): Promise<void> => {
  loadingActive.value = true
  try {
    const result = await listActiveSuspensions()
    activeRecords.value = result.records
    scopes.value = result.scopes
  } catch (error) {
    handleLoadError(error, t('maintenance.error.loadActive'))
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
    handleLoadError(error, t('maintenance.error.loadHistory'))
  } finally {
    loadingHistory.value = false
  }
}

// loadRooms fetches parent rooms for the room picker.
const loadRooms = async (): Promise<void> => {
  try {
    rooms.value = await listRooms()
  } catch (error) {
    handleLoadError(error, t('maintenance.error.loadRooms'))
  }
}

// refreshPage reloads everything shown on the page.
const refreshPage = async (): Promise<void> => {
  errorMessage.value = ''
  await Promise.all([loadActive(), loadHistory(), loadRooms()])
}

// handleLoadError shows the backend reason and hands expired sessions back to the shell.
const handleLoadError = (error: unknown, fallback: string): void => {
  errorMessage.value = apiErrorMessage(error, fallback)
  if (errorMessage.value.includes('401')) emit('unauthenticated')
}

// openSuspendDialog opens the Suspend dialog on its form step.
const openSuspendDialog = (): void => {
  errorMessage.value = ''
  confirmOpen.value = false
  suspendOpen.value = true
}

// openConfirm moves the dialog to the confirm step; nothing is sent until the admin confirms.
const openConfirm = (): void => {
  if (!formIsValid.value) return
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
    suspendOpen.value = false
    confirmOpen.value = false
    // A command warning means the suspension is saved but the game server will pick it up late.
    if (result.commandWarning) toast.warning(result.commandWarning)
    else toast.success(t('maintenance.toast.suspended', { target: suspensionTarget(result.record) }))
    form.message = ''
    form.expectedBackAt = ''
    await Promise.all([loadActive(), loadHistory()])
  } catch (error) {
    // Close the dialog so the page-level error explains why nothing was suspended.
    suspendOpen.value = false
    confirmOpen.value = false
    handleLoadError(error, t('maintenance.error.suspend'))
  } finally {
    submitting.value = false
  }
}

// resume ends the confirmed suspension. The game server restarts countdowns in tables that have players.
const resume = async (): Promise<void> => {
  const record = resumeTarget.value
  if (!record) return
  resumeTarget.value = null
  resumingId.value = record.id
  errorMessage.value = ''
  try {
    const result = await endSuspension(record.id, '')
    if (result.commandWarning) toast.warning(result.commandWarning)
    else toast.success(t('maintenance.toast.resumed', { target: suspensionTarget(record) }))
    await Promise.all([loadActive(), loadHistory()])
  } catch (error) {
    handleLoadError(error, t('maintenance.error.resume'))
  } finally {
    resumingId.value = 0
  }
}

// suspensionTarget names what a suspension covers in plain words.
const suspensionTarget = (record: GameSuspension): string => {
  if (record.scope === 'room') return t('maintenance.target.room', { code: record.room_code || `#${record.room_id}` })
  return record.scope === 'site' ? t('maintenance.target.site') : t('maintenance.target.allGames')
}

// scopeHint explains each level next to its radio button.
const scopeHint = (scope: SuspensionScope): string => {
  if (scope === 'site') return t('maintenance.hint.site')
  if (scope === 'all_games') return t('maintenance.hint.allGames')
  return t('maintenance.hint.room')
}

// policyLabel turns the stored policy into the wording used on the form.
const policyLabel = (policy: RunningRoundPolicy): string => (policy === 'force_stop' ? t('maintenance.policy.forceStop') : t('maintenance.policy.drain'))

watch(historyPage, () => {
  void loadHistory()
})

onMounted(() => {
  void refreshPage()
})
</script>
