<template>
  <div class="grid gap-4">
    <PageHeader :title="t('bets.title')" :description="t('bets.description')">
      <template #actions>
        <RefreshButton :loading="refreshingActiveTab" @click="refreshPage" />
      </template>
    </PageHeader>

    <Tabs v-model="activeTab">
      <TabsList class="h-auto flex-wrap justify-start">
        <TabsTrigger v-for="tab in gameTabs" :key="tab.name" :value="tab.name" class="px-3 py-1.5">
          <component :is="tab.icon" />
          {{ t(tab.label) }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <ErrorAlert :message="errorMessage" />

    <!-- Overview -->
    <template v-if="activeTab === 'overview'">
      <section class="grid gap-3 sm:grid-cols-3">
        <StatCard v-for="stat in stats" :key="stat.label" :label="stat.label" :value="stat.value" :icon="stat.icon" />
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <DataPanel :title="t('bets.recentBets')" size="compact" :loading="loading" :empty="records.length === 0" :empty-title="t('bets.noBetsYet')" :empty-icon="WalletIcon">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('col.ticket') }}</TableHead>
                <TableHead>{{ t('col.member') }}</TableHead>
                <TableHead class="text-right">{{ t('col.amount') }}</TableHead>
                <TableHead>{{ t('col.status') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="record in records.slice(0, 8)" :key="record.id">
                <TableCell class="font-mono text-xs text-primary">{{ record.round_ticket || record.hold_key }}</TableCell>
                <TableCell class="font-medium">#{{ record.member_id }}</TableCell>
                <TableCell class="text-right font-mono tabular-nums">{{ formatMoney(record.amount) }}</TableCell>
                <TableCell><StatusBadge :view="betStatusView(record.status)" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DataPanel>

        <SectionCard :title="t('bets.payoutRooms')">
          <div class="grid gap-2 sm:grid-cols-2">
            <div v-for="room in payoutRoomSummaries" :key="room.roomId" class="rounded-lg border bg-muted/50 p-3">
              <div class="mb-1 flex items-center justify-between gap-3">
                <strong class="font-medium">{{ room.roomCode || t('common.roomFallback', { id: room.roomId }) }}</strong>
                <span class="text-xs text-primary tabular-nums">{{ formatMoney(room.entryFee) }}</span>
              </div>
              <p class="mb-3 text-xs text-muted-foreground">{{ t('bets.payoutRows', { count: room.configCount }) }}</p>
              <Button variant="outline" size="sm" class="w-full" :disabled="!roomById(room.roomId)" @click="editRoomById(room.roomId)">
                <PencilIcon />
                {{ t('bets.editRoom') }}
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </template>

    <!-- Room setup -->
    <SectionCard v-if="activeTab === 'room-setup'" :title="t('bets.configuredRooms')" :description="t('bets.configuredRoomsDesc')">
      <template #actions>
        <Button @click="openCreateRoom">
          <PlusIcon />
          {{ t('bets.createRoom') }}
        </Button>
      </template>
      <p v-if="rooms.length === 0" class="py-10 text-center text-sm text-muted-foreground">{{ t('bets.noRooms') }}</p>
      <div v-else class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <div v-for="room in rooms" :key="room.id" class="rounded-lg border bg-muted/50 p-3">
          <div class="mb-1 flex items-center justify-between gap-3">
            <strong class="font-medium">{{ room.code || t('common.roomFallback', { id: room.id }) }}</strong>
            <span class="text-xs text-primary tabular-nums">{{ formatMoney(room.entry_fee) }}</span>
          </div>
          <div class="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span class="truncate">{{ room.name }} · #{{ room.sort_order }}</span>
            <StatusBadge :view="activeStatusView(room.status_id === 1)" />
          </div>
          <p class="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TimerIcon class="size-3.5" />
            {{ t('bets.roomTurnTimer', { seconds: room.turn_timeout_seconds }) }}
          </p>
          <Button variant="outline" size="sm" class="w-full" @click="startRoomEdit(room)">
            <PencilIcon />
            {{ t('bets.editRoom') }}
          </Button>
        </div>
      </div>
    </SectionCard>

    <!-- Payout config -->
    <DataPanel v-if="activeTab === 'payout-config'" :title="t('bets.payout.title')" :description="t('bets.payout.desc')" :empty="payoutConfigRows.length === 0" :empty-title="t('bets.payout.none')" :empty-icon="PercentIcon">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('col.players') }}</TableHead>
            <TableHead>{{ t('col.room') }}</TableHead>
            <TableHead class="text-right">{{ t('col.entryFee') }}</TableHead>
            <TableHead>{{ t('col.rakePercent') }}</TableHead>
            <TableHead>{{ t('col.rankPercent', { rank: 1 }) }}</TableHead>
            <TableHead>{{ t('col.rankPercent', { rank: 2 }) }}</TableHead>
            <TableHead>{{ t('col.rankPercent', { rank: 3 }) }}</TableHead>
            <TableHead>{{ t('col.rankPercent', { rank: 4 }) }}</TableHead>
            <TableHead class="text-right">{{ t('col.action') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-for="config in payoutConfigRows" :key="config.key">
            <TableRow v-if="payoutEdits[config.key]">
              <TableCell class="font-medium">{{ config.playerCount }}</TableCell>
              <TableCell>
                <span class="block font-medium">{{ config.roomCode || t('common.roomFallback', { id: config.roomId }) }}</span>
                <span class="text-xs text-muted-foreground">{{ config.roomName }}</span>
              </TableCell>
              <TableCell class="text-right tabular-nums">{{ formatMoney(config.entryFee) }}</TableCell>
              <TableCell><Input v-model.number="payoutEdits[config.key].rakePercent" type="number" min="0" max="99" step="0.01" class="w-20" /></TableCell>
              <TableCell><Input v-model.number="payoutEdits[config.key].rankPercents[1]" type="number" min="0" max="100" step="0.01" class="w-20" /></TableCell>
              <TableCell><Input v-model.number="payoutEdits[config.key].rankPercents[2]" type="number" min="0" max="100" step="0.01" class="w-20" /></TableCell>
              <TableCell>
                <Input v-if="config.playerCount >= 3" v-model.number="payoutEdits[config.key].rankPercents[3]" type="number" min="0" max="100" step="0.01" class="w-20" />
                <span v-else class="text-muted-foreground">-</span>
              </TableCell>
              <TableCell>
                <Input v-if="config.playerCount >= 4" v-model.number="payoutEdits[config.key].rankPercents[4]" type="number" min="0" max="100" step="0.01" class="w-20" />
                <span v-else class="text-muted-foreground">-</span>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="outline" size="sm" :disabled="savingPayoutKey === config.key" @click="savePayoutConfig(config)">
                  <Loader2Icon v-if="savingPayoutKey === config.key" class="animate-spin" />
                  <SaveIcon v-else />
                  {{ t('common.save') }}
                </Button>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </DataPanel>

    <!-- Special payout -->
    <div v-if="activeTab === 'special-payout'" class="grid gap-4 xl:grid-cols-[minmax(24rem,32rem)_minmax(0,1fr)]">
      <SectionCard :title="t('bets.special.rulesTitle')" :description="t('bets.special.rulesDesc')" class="h-max">
        <p v-if="specialRules.length === 0" class="py-10 text-center text-sm text-muted-foreground">{{ t('bets.special.noRules') }}</p>
        <!-- One block per room: the balance players need to join (live while editing), then each cut rule. -->
        <div v-else class="grid max-h-[44rem] gap-4 overflow-auto">
          <section v-for="group in specialRuleGroups" :key="group.roomId" class="rounded-lg border bg-muted/30">
            <div class="flex flex-wrap items-start justify-between gap-2 border-b px-3 py-2.5">
              <div>
                <strong class="font-medium">{{ group.roomCode || t('common.roomFallback', { id: group.roomId }) }}</strong>
                <p class="text-xs text-muted-foreground">{{ t('bets.special.roomFee', { fee: formatRiel(group.entryFee) }) }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-primary">{{ t('bets.special.minimumBalance', { amount: formatRiel(group.minimumBalance) }) }}</p>
              </div>
              <p class="w-full text-xs text-muted-foreground">{{ t('bets.special.minimumBalanceHint') }}</p>
            </div>

            <div class="grid gap-3 p-3">
              <div v-for="rule in group.rules" :key="rule.id" class="rounded-lg border bg-muted/50 p-3">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <strong class="text-sm font-medium">{{ ruleLabel(rule.event_type) }}</strong>
                  <StatusBadge :view="activeStatusView(rule.status_id === 1, true)" />
                </div>

                <div v-if="specialRuleEdits[rule.id]" class="grid gap-3 sm:grid-cols-2">
                  <FormField :id="`rule-type-${rule.id}`" :label="t('bets.special.payoutType')">
                    <NativeSelect :id="`rule-type-${rule.id}`" v-model="specialRuleEdits[rule.id].payout_type" class="w-full">
                      <NativeSelectOption value="entry_fee_multiplier">{{ t('bets.special.entryFeeMultiplier') }}</NativeSelectOption>
                      <NativeSelectOption value="fixed_amount">{{ t('bets.special.fixedAmount') }}</NativeSelectOption>
                    </NativeSelect>
                  </FormField>
                  <FormField :id="`rule-value-${rule.id}`" :label="t('bets.special.value')">
                    <Input :id="`rule-value-${rule.id}`" v-model.number="specialRuleEdits[rule.id].payout_value" type="number" min="0.01" step="0.01" />
                  </FormField>
                  <FormField :id="`rule-commission-${rule.id}`" :label="t('bets.special.commission')">
                    <Input :id="`rule-commission-${rule.id}`" v-model.number="specialRuleEdits[rule.id].commissionPercentInput" type="number" min="0" max="99" step="0.01" />
                  </FormField>
                  <FormField :id="`rule-status-${rule.id}`" :label="t('bets.special.status')">
                    <NativeSelect :id="`rule-status-${rule.id}`" v-model.number="specialRuleEdits[rule.id].status_id" class="w-full">
                      <NativeSelectOption :value="1">{{ t('status.active') }}</NativeSelectOption>
                      <NativeSelectOption :value="2">{{ t('status.paused') }}</NativeSelectOption>
                    </NativeSelect>
                  </FormField>
                </div>

                <!-- What one cut moves with the values in the form (unsaved edits included). -->
                <p v-if="ruleInput(rule).active" class="mt-3 rounded-md bg-background/60 px-2.5 py-1.5 text-xs">
                  {{
                    t('bets.special.cutAmounts', {
                      gross: formatRiel(cutAmounts(rule).gross),
                      net: formatRiel(cutAmounts(rule).net),
                      percent: Number(specialRuleEdits[rule.id]?.commissionPercentInput ?? 0),
                    })
                  }}
                </p>
                <p v-else class="mt-3 rounded-md bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground">{{ t('bets.special.pausedNoCharge') }}</p>

                <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p class="text-xs text-muted-foreground">{{ t('bets.special.pays', { payer: partyLabel(rule.payer), receiver: partyLabel(rule.receiver) }) }}</p>
                  <Button variant="outline" size="sm" :disabled="savingSpecialRuleId === rule.id" @click="saveSpecialRule(rule)">
                    <Loader2Icon v-if="savingSpecialRuleId === rule.id" class="animate-spin" />
                    <SaveIcon v-else />
                    {{ t('common.save') }}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </SectionCard>

      <DataPanel :title="t('bets.special.ledgerTitle')" :description="t('bets.special.ledgerDesc')" :loading="specialLoading" :empty="specialPayouts.length === 0" :empty-title="t('bets.special.none')" :empty-icon="SparklesIcon">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('col.ticket') }}</TableHead>
              <TableHead>{{ t('col.payer') }}</TableHead>
              <TableHead>{{ t('col.receiver') }}</TableHead>
              <TableHead class="text-right">{{ t('col.gross') }}</TableHead>
              <TableHead class="text-right">{{ t('col.commission') }}</TableHead>
              <TableHead class="text-right">{{ t('col.net') }}</TableHead>
              <TableHead>{{ t('col.settled') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="record in specialPayouts" :key="record.id">
              <TableCell>
                <span class="block font-mono text-xs text-primary">{{ record.round_ticket }}</span>
                <span class="block text-xs text-muted-foreground">{{ ruleLabel(record.event_type) }} · P{{ record.parent_room_id }} / I{{ record.inner_room_id }} · R{{ record.round_number }}</span>
              </TableCell>
              <TableCell class="font-medium">#{{ record.payer_member_id }}</TableCell>
              <TableCell class="font-medium">#{{ record.receiver_member_id }}</TableCell>
              <TableCell class="text-right tabular-nums text-destructive">{{ formatMoney(record.gross_amount) }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatMoney(record.commission_amount) }}</TableCell>
              <TableCell class="text-right tabular-nums text-success">{{ formatMoney(record.net_amount) }}</TableCell>
              <TableCell class="text-muted-foreground">{{ formatDate(record.settled_at || record.created_at) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <template #footer>
          <PaginationBar v-model:page="specialPage" v-model:per-page="specialPerPage" :total="specialTotal" :item-label="t('items.specialPayouts')" />
        </template>
      </DataPanel>
    </div>

    <!-- Bet ledger -->
    <DataPanel v-if="activeTab === 'bet-ledger'" :loading="loading" :empty="filteredRecords.length === 0" :empty-title="t('bets.ledger.none')" :empty-icon="WalletIcon" :empty-text="t('bets.ledger.noneText')">
      <template #toolbar>
        <div class="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          <Button
            v-for="filter in BET_STATUS_FILTERS"
            :key="filter.value || 'all'"
            size="sm"
            :variant="betStatusGroup === filter.value ? 'secondary' : 'ghost'"
            :class="betStatusGroup === filter.value ? 'bg-background shadow-sm' : 'text-muted-foreground'"
            @click="betStatusGroup = filter.value"
          >
            {{ t(filter.label) }}
          </Button>
        </div>
        <SearchInput v-model="search" :placeholder="t('bets.ledger.searchPlaceholder')" />
      </template>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('col.ticket') }}</TableHead>
            <TableHead>{{ t('col.member') }}</TableHead>
            <TableHead>{{ t('col.room') }}</TableHead>
            <TableHead class="text-right">{{ t('col.amount') }}</TableHead>
            <TableHead class="text-right">{{ t('col.payout') }}</TableHead>
            <TableHead>{{ t('col.status') }}</TableHead>
            <TableHead>{{ t('col.created') }}</TableHead>
            <TableHead>{{ t('col.refund') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="record in filteredRecords" :key="record.id">
            <TableCell>
              <span class="block font-mono text-xs text-primary">{{ record.round_ticket || record.hold_key }}</span>
              <span class="text-xs text-muted-foreground">{{ t('bets.ledger.round', { round: record.round_number }) }}</span>
            </TableCell>
            <TableCell class="font-medium">#{{ record.member_id }}</TableCell>
            <TableCell class="text-muted-foreground">P{{ record.parent_room_id }} / I{{ record.inner_room_id }}</TableCell>
            <TableCell class="text-right font-mono tabular-nums">{{ formatMoney(record.amount) }}</TableCell>
            <TableCell class="text-right font-mono tabular-nums">{{ formatMoney(record.payout_amount) }}</TableCell>
            <TableCell>
              <StatusBadge :view="betStatusView(record.status)" />
              <span class="mt-1 block text-xs text-muted-foreground">{{ betResultLabel(record.result) || betReasonLabel(record.reason) }}</span>
            </TableCell>
            <TableCell class="text-muted-foreground">{{ formatDate(record.created_at) }}</TableCell>
            <TableCell class="whitespace-normal">
              <!-- Refund is offered only for escrowed bets; the game server still refuses it while the round is live. -->
              <StatusBadge v-if="record.refund_request_status" class="mb-1" :view="refundStatusView(record.refund_request_status)" :title="record.refund_failure_reason || ''" />
              <span v-if="record.refund_request_status === 'failed' && record.refund_failure_reason" class="mb-1 block max-w-56 text-xs text-destructive">{{ record.refund_failure_reason }}</span>
              <Button v-if="canRequestRefund(record)" variant="outline" size="sm" class="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" @click="openRefundDialog(record)">
                <Undo2Icon />
                {{ record.refund_request_status === 'failed' ? t('bets.ledger.retryRefund') : t('bets.ledger.refund') }}
              </Button>
              <span v-else-if="!record.refund_request_status" class="text-xs text-muted-foreground">-</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <template #footer>
        <PaginationBar v-model:page="page" v-model:per-page="perPage" :total="total" :item-label="t('items.bets')" />
      </template>
    </DataPanel>

    <!-- Create/edit room opens in a dialog so the room list can use the full width. -->
    <Dialog v-model:open="roomDialogOpen">
      <DialogContent class="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingRoomId ? t('bets.roomDialog.editTitle') : t('bets.roomDialog.createTitle') }}</DialogTitle>
          <DialogDescription>{{ editingRoomId ? t('bets.roomDialog.editDesc') : t('bets.roomDialog.createDesc') }}</DialogDescription>
        </DialogHeader>

        <form id="room-form" class="grid gap-4" @submit.prevent="editingRoomId ? saveRoom() : createRoom()">
          <FormField id="room-code" :label="t('bets.roomDialog.code')" :hint="editingRoomId ? t('bets.roomDialog.codeLocked') : undefined">
            <Input id="room-code" v-model.trim="roomForm.room_code" :disabled="Boolean(editingRoomId)" placeholder="TL-011" />
          </FormField>
          <FormField id="room-name" :label="t('bets.roomDialog.name')">
            <Input id="room-name" v-model.trim="roomForm.room_name" placeholder="TienLen Room" />
          </FormField>
          <FormField id="room-fee" :label="t('bets.roomDialog.entryFee')">
            <Input id="room-fee" v-model.number="roomForm.entry_fee" type="number" min="1" step="1" placeholder="2000000" />
          </FormField>
          <div v-if="editingRoomId" class="grid grid-cols-2 gap-4">
            <FormField id="room-status" :label="t('bets.roomDialog.status')">
              <NativeSelect id="room-status" v-model.number="roomForm.status_id" class="w-full">
                <NativeSelectOption :value="1">{{ t('status.active') }}</NativeSelectOption>
                <NativeSelectOption :value="2">{{ t('status.inactive') }}</NativeSelectOption>
              </NativeSelect>
            </FormField>
            <FormField id="room-order" :label="t('bets.roomDialog.order')">
              <Input id="room-order" v-model.number="roomForm.order" type="number" min="1" step="1" />
            </FormField>
          </div>
          <FormField id="room-timeout" :label="t('bets.roomDialog.timeout')" :hint="t('bets.roomDialog.timeoutHint')">
            <Input id="room-timeout" v-model.number="roomForm.turn_timeout_seconds" type="number" min="3" max="300" step="1" />
          </FormField>

          <ErrorAlert :message="errorMessage" />
        </form>

        <DialogFooter>
          <Button variant="outline" :disabled="creatingRoom || savingRoom" @click="roomDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button type="submit" form="room-form" :disabled="creatingRoom || savingRoom">
            <Loader2Icon v-if="creatingRoom || savingRoom" class="animate-spin" />
            {{ editingRoomId ? t('bets.roomDialog.save') : t('bets.roomDialog.create') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Refund confirmation: a reason is required because this returns money outside the normal round flow. -->
    <Dialog :open="Boolean(refundTarget)" @update:open="(open) => { if (!open) closeRefundDialog() }">
      <DialogContent class="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('bets.refund.title') }}</DialogTitle>
          <DialogDescription v-if="refundTarget">
            {{
              t('bets.refund.target', {
                member: refundTarget.member_id,
                amount: formatMoney(refundTarget.amount),
                parent: refundTarget.parent_room_id,
                inner: refundTarget.inner_room_id,
                round: refundTarget.round_number,
              })
            }}
          </DialogDescription>
        </DialogHeader>

        <form id="refund-form" class="grid gap-4" @submit.prevent="submitRefund">
          <Alert class="border-warning/30 bg-warning/10 text-warning">
            <AlertDescription class="text-warning">
              {{ t('bets.refund.warning') }}
            </AlertDescription>
          </Alert>
          <FormField id="refund-reason" :label="t('bets.refund.reason')">
            <Textarea id="refund-reason" v-model="refundReason" rows="3" maxlength="255" :placeholder="t('bets.refund.reasonPlaceholder')" />
          </FormField>
          <ErrorAlert :message="refundError" />
        </form>

        <DialogFooter>
          <Button variant="outline" :disabled="refundSubmitting" @click="closeRefundDialog">{{ t('common.cancel') }}</Button>
          <Button type="submit" form="refund-form" variant="destructive" :disabled="refundSubmitting || !refundReason.trim()">
            <Loader2Icon v-if="refundSubmitting" class="animate-spin" />
            <Undo2Icon v-else />
            {{ t('bets.refund.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { toast } from 'vue-sonner'
import {
  CoinsIcon,
  DoorOpenIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  PencilIcon,
  PercentIcon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  TimerIcon,
  Undo2Icon,
  WalletIcon,
} from '@lucide/vue'
import DataPanel from '@/components/admin/DataPanel.vue'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import FormField from '@/components/admin/FormField.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import PaginationBar from '@/components/admin/PaginationBar.vue'
import RefreshButton from '@/components/admin/RefreshButton.vue'
import SearchInput from '@/components/admin/SearchInput.vue'
import SectionCard from '@/components/admin/SectionCard.vue'
import StatCard from '@/components/admin/StatCard.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { t, type MessageKey } from '@/i18n/adminLanguage'
import { formatDate, formatMoney, formatNumber, formatRiel } from '@/lib/format'
import { minimumBalanceForRound, specialPayoutAmounts, type SpecialPayoutAmounts, type SpecialRuleInput } from '@/lib/specialPayout'
import { activeStatusView, betReasonLabel, betResultLabel, betStatusView, refundStatusView } from '@/lib/status'
import {
  createRoomWithPayoutConfigs,
  listGamePayoutConfigs,
  listGameRoundBets,
  listGameSpecialPayoutRules,
  listGameSpecialPayouts,
  listRooms,
  updateRoom,
  updateRoomPayoutConfigs,
  updateRoomSpecialPayoutRule,
  requestBetRefund,
  apiErrorMessage,
  type GamePayoutConfig,
  type BetStatusGroup,
  type GameRoundBet,
  type GameSpecialPayout,
  type GameSpecialPayoutRule,
  type Room,
} from '../api/adminApi'
import { useAdminLiveRefresh } from '../api/adminLive'

const emit = defineEmits<{
  // Unauthorized loads are surfaced to the shell so it can clear auth and return to login.
  unauthenticated: []
}>()

const loading = ref(false)
const specialLoading = ref(false)
const creatingRoom = ref(false)
const savingPayoutKey = ref('')
const savingSpecialRuleId = ref(0)
const errorMessage = ref('')
const records = ref<GameRoundBet[]>([])
const payoutConfigs = ref<GamePayoutConfig[]>([])
const specialRules = ref<GameSpecialPayoutRule[]>([])
const specialPayouts = ref<GameSpecialPayout[]>([])
const rooms = ref<Room[]>([])
// editingRoomId switches the Room Setup form from "create" to "edit this room" (0 = creating).
const editingRoomId = ref(0)
const savingRoom = ref(false)
// roomDialogOpen shows the create/edit room dialog; editingRoomId decides which of the two it is.
const roomDialogOpen = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const specialPage = ref(1)
const specialPerPage = ref(20)
const specialTotal = ref(0)
const search = ref('')
// betStatusGroup filters the ledger on the server ("refundable" = held or in a round), so it covers all pages.
const betStatusGroup = ref<BetStatusGroup>('')
// BET_STATUS_FILTERS are the ledger filter buttons, in the order admins usually need them.
const BET_STATUS_FILTERS: Array<{ value: BetStatusGroup; label: MessageKey }> = [
  { value: '', label: 'bets.filter.all' },
  { value: 'refundable', label: 'bets.filter.refundable' },
  { value: 'settled', label: 'bets.filter.settled' },
  { value: 'released', label: 'bets.filter.released' },
]
const activeTab = ref<GameTabName>('overview')
// DEFAULT_TURN_TIMEOUT_SECONDS matches the API default (DefaultRoomTurnTimeoutSeconds) for new rooms.
const DEFAULT_TURN_TIMEOUT_SECONDS = 10
const roomForm = reactive({
  room_code: '',
  room_name: 'TienLen Room',
  entry_fee: 0,
  status_id: 1,
  order: 1,
  turn_timeout_seconds: DEFAULT_TURN_TIMEOUT_SECONDS,
})
const payoutEdits = ref<Record<string, PayoutEdit>>({})
const specialRuleEdits = ref<Record<number, SpecialRuleEdit>>({})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const specialTotalPages = computed(() => Math.max(1, Math.ceil(specialTotal.value / specialPerPage.value)))

type GameTabName = 'overview' | 'room-setup' | 'payout-config' | 'special-payout' | 'bet-ledger'

interface PayoutConfigRow {
  key: string
  roomId: number
  roomCode: string
  roomName: string
  entryFee: number
  playerCount: number
  rakePercent: number
  rankPercents: Record<number, number>
}

interface PayoutEdit {
  rakePercent: number
  rankPercents: Record<number, number>
}

interface SpecialRuleEdit {
  event_type: string
  payout_type: string
  payout_value: number
  commissionPercentInput: number
  payer: string
  receiver: string
  status_id: number
  order: number
}


// gameTabs defines the local game-area navigation as this page grows beyond one table.
const gameTabs: Array<{ name: GameTabName; label: MessageKey; icon: Component }> = [
  { name: 'overview', label: 'bets.tab.overview', icon: LayoutDashboardIcon },
  { name: 'room-setup', label: 'bets.tab.roomSetup', icon: DoorOpenIcon },
  { name: 'payout-config', label: 'bets.tab.payoutConfig', icon: PercentIcon },
  { name: 'special-payout', label: 'bets.tab.specialPayout', icon: SparklesIcon },
  { name: 'bet-ledger', label: 'bets.tab.betLedger', icon: WalletIcon },
]

// payoutConfigRows groups DB rows into one display row per room and player count for the percent table.
const payoutConfigRows = computed(() => {
  const grouped = new Map<string, PayoutConfigRow>()
  for (const config of payoutConfigs.value) {
    const key = `${config.room_id}-${config.player_count}`
    const row = grouped.get(key) ?? {
      key,
      roomId: config.room_id,
      roomCode: config.room_code,
      roomName: config.room_name,
      entryFee: config.entry_fee,
      playerCount: config.player_count,
      rakePercent: config.rake_percent,
      rankPercents: { 1: 0, 2: 0, 3: 0, 4: 0 },
    }
    row.roomCode = config.room_code
    row.roomName = config.room_name
    row.entryFee = config.entry_fee
    row.rakePercent = config.rake_percent
    row.rankPercents[config.rank] = config.payout_percent
    grouped.set(key, row)
  }
  return [...grouped.values()].sort((left, right) => left.entryFee - right.entryFee || left.playerCount - right.playerCount)
})

const stats = computed(() => [
  { label: t('bets.totalBets'), value: formatNumber(total.value), icon: WalletIcon },
  { label: t('bets.amountOnPage'), value: formatMoney(records.value.reduce((sum, record) => sum + record.amount, 0)), icon: CoinsIcon },
  { label: t('bets.avgTimeout'), value: formatAverageTimeout(rooms.value), icon: TimerIcon },
])

// refreshingActiveTab keeps the shell refresh indicator tied to the current operation area.
const refreshingActiveTab = computed(() => {
  if (activeTab.value === 'special-payout') return specialLoading.value
  return loading.value
})

const payoutRoomSummaries = computed(() => {
  const grouped = new Map<number, { roomId: number; roomCode: string; entryFee: number; configCount: number }>()
  for (const config of payoutConfigs.value) {
    const row = grouped.get(config.room_id) ?? {
      roomId: config.room_id,
      roomCode: config.room_code,
      entryFee: config.entry_fee,
      configCount: 0,
    }
    row.roomCode = config.room_code
    row.entryFee = config.entry_fee
    row.configCount += 1
    grouped.set(config.room_id, row)
  }
  return [...grouped.values()].sort((left, right) => left.entryFee - right.entryFee)
})

const filteredRecords = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return records.value
  return records.value.filter((record) => {
    const haystack = [
      record.hold_key,
      record.round_ticket,
      record.round_number,
      record.member_id,
      record.parent_room_id,
      record.inner_room_id,
      record.status,
      record.result,
      record.reason,
    ].join(' ').toLowerCase()
    return haystack.includes(term)
  })
})

// ruleInput reads a rule's money settings from its form (unsaved edits included), falling back to the saved
// rule, so the cut amounts and the balance needed update while the admin types.
const ruleInput = (rule: GameSpecialPayoutRule): SpecialRuleInput => {
  const edit = specialRuleEdits.value[rule.id]
  if (!edit) {
    return {
      event_type: rule.event_type,
      payout_type: rule.payout_type,
      payout_value: rule.payout_value,
      commission: rule.commission_percent,
      active: rule.status_id === 1,
    }
  }
  return {
    event_type: edit.event_type,
    payout_type: edit.payout_type,
    payout_value: Number(edit.payout_value),
    commission: Number(edit.commissionPercentInput || 0) / 100,
    active: edit.status_id === 1,
  }
}

// cutAmounts is what one cut of this rule moves in its room (loser pays gross, winner gets net).
const cutAmounts = (rule: GameSpecialPayoutRule): SpecialPayoutAmounts => specialPayoutAmounts(ruleInput(rule), rule.entry_fee)

// specialRuleGroups puts each room's cut rules together with the balance its players need to join,
// calculated the same way the game server does before a round starts (lib/specialPayout.ts).
const specialRuleGroups = computed(() => {
  const groups = new Map<number, { roomId: number; roomCode: string; entryFee: number; rules: GameSpecialPayoutRule[]; minimumBalance: number }>()
  for (const rule of specialRules.value) {
    const group = groups.get(rule.room_id) ?? { roomId: rule.room_id, roomCode: rule.room_code, entryFee: rule.entry_fee, rules: [], minimumBalance: 0 }
    group.rules.push(rule)
    groups.set(rule.room_id, group)
  }
  return [...groups.values()].map((group) => ({
    ...group,
    minimumBalance: minimumBalanceForRound(group.rules.map(ruleInput), group.entryFee),
  }))
})

// syncPayoutEdits converts backend decimal shares into percent inputs whenever fresh config rows arrive.
const syncPayoutEdits = (rows: PayoutConfigRow[]): void => {
  const next: Record<string, PayoutEdit> = {}
  for (const row of rows) {
    next[row.key] = {
      rakePercent: percentInput(row.rakePercent),
      rankPercents: {
        1: percentInput(row.rankPercents[1]),
        2: percentInput(row.rankPercents[2]),
        3: percentInput(row.rankPercents[3]),
        4: percentInput(row.rankPercents[4]),
      },
    }
  }
  payoutEdits.value = next
}

// syncSpecialRuleEdits converts database decimal commission into percent inputs for admin editing.
const syncSpecialRuleEdits = (rows: GameSpecialPayoutRule[]): void => {
  const next: Record<number, SpecialRuleEdit> = {}
  for (const rule of rows) {
    next[rule.id] = {
      event_type: rule.event_type,
      payout_type: rule.payout_type,
      payout_value: rule.payout_value,
      commissionPercentInput: percentInput(rule.commission_percent),
      payer: rule.payer,
      receiver: rule.receiver,
      status_id: rule.status_id,
      order: rule.order,
    }
  }
  specialRuleEdits.value = next
}


// loadBets refreshes the current bet ledger page while preserving pagination choices.
// silent is used by live updates: it keeps the table and any success/error message on screen.
const loadBets = async (silent = false): Promise<void> => {
  if (!silent) {
    errorMessage.value = ''
    loading.value = true
  }
  try {
    const result = await listGameRoundBets(page.value, perPage.value, betStatusGroup.value)
    records.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.loadBets'))
    if (errorMessage.value.includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// loadPayoutConfigs reads the database-backed payout percent table for admin audit display.
const loadPayoutConfigs = async (): Promise<void> => {
  errorMessage.value = ''
  try {
    payoutConfigs.value = await listGamePayoutConfigs()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.loadPayout'))
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  }
}

// loadSpecialPayoutRules reads room-level special payout configuration for admin editing.
const loadSpecialPayoutRules = async (): Promise<void> => {
  errorMessage.value = ''
  try {
    specialRules.value = await listGameSpecialPayoutRules()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.loadRules'))
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  }
}

// loadSpecialPayouts refreshes the special payout ledger independently from the normal bet ledger.
const loadSpecialPayouts = async (): Promise<void> => {
  errorMessage.value = ''
  specialLoading.value = true
  try {
    const result = await listGameSpecialPayouts(specialPage.value, specialPerPage.value)
    specialPayouts.value = result.records
    specialTotal.value = result.total
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.loadSpecial'))
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    specialLoading.value = false
  }
}


// loadRooms reads the parent rooms shown as Configured Rooms (name, fee, status, order).
const loadRooms = async (): Promise<void> => {
  try {
    rooms.value = await listRooms()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.loadRooms'))
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  }
}

// startRoomEdit fills the Room Setup form with one room so it can be edited in place.
const startRoomEdit = (room: Room): void => {
  errorMessage.value = ''
  editingRoomId.value = room.id
  roomForm.room_code = room.code
  roomForm.room_name = room.name
  roomForm.entry_fee = room.entry_fee
  roomForm.status_id = room.status_id
  roomForm.order = room.sort_order
  roomForm.turn_timeout_seconds = room.turn_timeout_seconds
  roomDialogOpen.value = true
}

// roomById finds a loaded room, used by the overview cards that only know the room id.
const roomById = (roomId: number): Room | undefined => rooms.value.find((room) => room.id === roomId)

// editRoomById opens the Edit room dialog from places that only have the room id.
const editRoomById = (roomId: number): void => {
  const room = roomById(roomId)
  if (room) startRoomEdit(room)
}

// openCreateRoom opens the dialog with an empty "create room" form.
const openCreateRoom = (): void => {
  errorMessage.value = ''
  cancelRoomEdit()
  roomDialogOpen.value = true
}

// cancelRoomEdit returns the form to "create room" with its defaults.
const cancelRoomEdit = (): void => {
  editingRoomId.value = 0
  roomForm.room_code = ''
  roomForm.room_name = 'TienLen Room'
  roomForm.entry_fee = 0
  roomForm.status_id = 1
  roomForm.order = 1
  roomForm.turn_timeout_seconds = DEFAULT_TURN_TIMEOUT_SECONDS
}

// saveRoom validates and saves the room being edited, including its turn timeout (the API saves both in one
// transaction), then refreshes every list that shows room data (payout configs carry the room's code/fee too).
const saveRoom = async (): Promise<void> => {
  errorMessage.value = ''
  if (!roomForm.room_name.trim()) {
    errorMessage.value = t('bets.error.roomNameRequired')
    return
  }
  if (roomForm.entry_fee <= 0) {
    errorMessage.value = t('bets.error.entryFeePositive')
    return
  }
  if (!Number.isInteger(roomForm.order) || roomForm.order <= 0) {
    errorMessage.value = t('bets.error.orderPositive')
    return
  }
  if (!isValidTurnTimeout(roomForm.turn_timeout_seconds)) {
    errorMessage.value = t('bets.error.timeoutRange')
    return
  }

  savingRoom.value = true
  try {
    const saved = await updateRoom(editingRoomId.value, {
      room_name: roomForm.room_name.trim(),
      entry_fee: roomForm.entry_fee,
      status_id: roomForm.status_id,
      order: roomForm.order,
      turn_timeout_seconds: roomForm.turn_timeout_seconds,
    })
    toast.success(t('bets.toast.roomUpdated', { code: saved.code }))
    roomDialogOpen.value = false
    cancelRoomEdit()
    await Promise.all([loadRooms(), loadPayoutConfigs()])
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.updateRoom'))
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    savingRoom.value = false
  }
}


// createRoom creates a new entry-fee room and relies on the backend to seed the standard payout matrices.
const createRoom = async (): Promise<void> => {
  errorMessage.value = ''
  if (!roomForm.room_code.trim()) {
    errorMessage.value = t('bets.error.roomCodeRequired')
    return
  }
  if (roomForm.entry_fee <= 0) {
    errorMessage.value = t('bets.error.entryFeePositive')
    return
  }
  if (!isValidTurnTimeout(roomForm.turn_timeout_seconds)) {
    errorMessage.value = t('bets.error.timeoutRange')
    return
  }

  creatingRoom.value = true
  try {
    await createRoomWithPayoutConfigs({
      room_code: roomForm.room_code.trim(),
      room_name: roomForm.room_name.trim() || 'TienLen Room',
      entry_fee: roomForm.entry_fee,
      status_id: roomForm.status_id,
      turn_timeout_seconds: roomForm.turn_timeout_seconds,
    })
    roomForm.room_code = ''
    roomForm.entry_fee = 0
    roomDialogOpen.value = false
    toast.success(t('bets.toast.roomCreated'))
    await Promise.all([loadRooms(), loadPayoutConfigs()])
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.createRoom'))
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    creatingRoom.value = false
  }
}


// savePayoutConfig persists one room/player-count row after verifying rank percentages still total 100%.
const savePayoutConfig = async (row: PayoutConfigRow): Promise<void> => {
  const edit = payoutEdits.value[row.key]
  if (!edit) return

  errorMessage.value = ''
  const ranks = Array.from({ length: row.playerCount }, (_, index) => index + 1)
  const totalPercent = ranks.reduce((sum, rank) => sum + Number(edit.rankPercents[rank] || 0), 0)
  if (Math.abs(totalPercent - 100) > 0.01) {
    errorMessage.value = t('bets.error.payoutTotal', { room: row.roomCode || t('common.roomFallback', { id: row.roomId }), players: row.playerCount })
    return
  }

  savingPayoutKey.value = row.key
  try {
    await updateRoomPayoutConfigs(row.roomId, {
      player_count: row.playerCount,
      rake_percent: decimalFromPercent(edit.rakePercent),
      rank_payouts: ranks.map((rank) => ({
        rank,
        payout_percent: decimalFromPercent(edit.rankPercents[rank] || 0),
      })),
    })
    toast.success(t('bets.toast.payoutSaved'))
    await loadPayoutConfigs()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.savePayout'))
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    savingPayoutKey.value = ''
  }
}

// saveSpecialRule persists one room's special-event payout rule for future settlements only.
const saveSpecialRule = async (rule: GameSpecialPayoutRule): Promise<void> => {
  const edit = specialRuleEdits.value[rule.id]
  if (!edit) return

  errorMessage.value = ''
  if (Number(edit.payout_value) <= 0) {
    errorMessage.value = t('bets.error.specialValuePositive')
    return
  }
  if (Number(edit.commissionPercentInput) < 0 || Number(edit.commissionPercentInput) >= 100) {
    errorMessage.value = t('bets.error.specialCommissionRange')
    return
  }

  savingSpecialRuleId.value = rule.id
  try {
    await updateRoomSpecialPayoutRule(rule.room_id, {
      event_type: edit.event_type,
      payout_type: edit.payout_type,
      payout_value: Number(edit.payout_value),
      commission_percent: decimalFromPercent(edit.commissionPercentInput),
      payer: edit.payer,
      receiver: edit.receiver,
      status_id: edit.status_id,
      order: edit.order,
    })
    toast.success(t('bets.toast.ruleSaved'))
    await loadSpecialPayoutRules()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('bets.error.saveRule'))
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    savingSpecialRuleId.value = 0
  }
}

// refreshPage reloads both ledger rows and payout config so the screen stays consistent.
const refreshPage = async (): Promise<void> => {
  if (activeTab.value === 'payout-config') {
    await loadPayoutConfigs()
    return
  }
  if (activeTab.value === 'room-setup') {
    await Promise.all([loadRooms(), loadPayoutConfigs()])
    return
  }
  if (activeTab.value === 'bet-ledger') {
    await loadBets()
    return
  }
  if (activeTab.value === 'special-payout') {
    await Promise.all([loadSpecialPayoutRules(), loadSpecialPayouts()])
    return
  }
  await Promise.all([loadBets(), loadRooms(), loadPayoutConfigs(), loadSpecialPayoutRules(), loadSpecialPayouts()])
}



// percentInput keeps percentage fields readable while preserving two decimals when admins need finer control.
const percentInput = (value = 0): number => Number((value * 100).toFixed(2))

// decimalFromPercent converts UI percentage input back into the backend settlement share format.
const decimalFromPercent = (value = 0): number => Number((Number(value || 0) / 100).toFixed(4))

// isValidTurnTimeout mirrors backend room-timer bounds so operators get immediate feedback before submit.
const isValidTurnTimeout = (value: number): boolean => Number.isInteger(Number(value)) && Number(value) >= 3 && Number(value) <= 300

// formatAverageTimeout summarizes configured room timing without implying it controls already-running rounds.
const formatAverageTimeout = (rows: Room[]): string => {
  if (rows.length === 0) return '-'
  const average = rows.reduce((sum, row) => sum + row.turn_timeout_seconds, 0) / rows.length
  return t('bets.avgTimeoutValue', { seconds: Math.round(average) })
}



// ruleLabel turns backend event keys into short admin labels without hiding the configured value.
const ruleLabel = (eventType: string): string => {
  if (eventType === 'beat_single_2') return t('bets.special.beatSingle2')
  if (eventType === 'beat_pair_2') return t('bets.special.beatPair2')
  return eventType || '-'
}

// partyLabel keeps money movement roles readable in the special payout editor.
const partyLabel = (value: string): string => {
  if (value === 'beaten_player') return t('bets.special.beatenPlayer')
  if (value === 'beating_player') return t('bets.special.beatingPlayer')
  return value || '-'
}

// Refund dialog state. refundTarget is the bet being refunded; null means the dialog is closed.
const refundTarget = ref<GameRoundBet | null>(null)
const refundReason = ref('')
const refundError = ref('')
const refundSubmitting = ref(false)

// REFUND_STATUS_REFRESH_MS is how long to wait before reloading the ledger after a refund request, giving the
// game server time to process it so the row shows done/failed instead of pending.
const REFUND_STATUS_REFRESH_MS = 1500

// canRequestRefund offers the button only for escrowed bets (held/unsettled) with no pending or completed
// refund. A failed request can be retried after its cause is fixed.
const canRequestRefund = (record: GameRoundBet): boolean => {
  const escrowed = record.status === 'held' || record.status === 'unsettled'
  const openRequest = record.refund_request_status === 'pending' || record.refund_request_status === 'done'
  return escrowed && !openRequest
}

// openRefundDialog starts a refund for one bet with an empty reason.
const openRefundDialog = (record: GameRoundBet): void => {
  refundTarget.value = record
  refundReason.value = ''
  refundError.value = ''
}

// closeRefundDialog cancels the refund unless a request is already being sent.
const closeRefundDialog = (): void => {
  if (refundSubmitting.value) return
  refundTarget.value = null
}

// submitRefund records the refund request, then reloads the ledger shortly after so the row shows whether
// the game server completed or refused it.
const submitRefund = async (): Promise<void> => {
  const target = refundTarget.value
  if (!target || !refundReason.value.trim()) return
  refundSubmitting.value = true
  refundError.value = ''
  try {
    const result = await requestBetRefund(target.id, refundReason.value.trim())
    refundTarget.value = null
    // A command warning means the request is saved but the game server will process it late.
    if (result.commandWarning) toast.warning(result.commandWarning)
    else toast.success(t('bets.toast.refundRequested', { member: target.member_id }))
    await loadBets(true)
    window.setTimeout(() => void loadBets(true), REFUND_STATUS_REFRESH_MS)
  } catch (error) {
    refundError.value = apiErrorMessage(error, t('bets.error.requestRefund'))
    if (refundError.value.includes('401')) emit('unauthenticated')
  } finally {
    refundSubmitting.value = false
  }
}


// Bets are held, settled, released, and refunded by the game server; the ledger and the overview's recent
// bets reload quietly. Room setup tabs are left alone so a live event never disturbs a form being edited.
useAdminLiveRefresh(['bets_changed'], () => {
  if (activeTab.value === 'bet-ledger' || activeTab.value === 'overview') void loadBets(true)
})

watch([page, perPage], () => {
  void loadBets()
})

// Changing the filter starts again at page 1 so the admin never lands on a page past the filtered total.
watch(betStatusGroup, () => {
  if (page.value === 1) void loadBets()
  else page.value = 1
})

watch([specialPage, specialPerPage], () => {
  void loadSpecialPayouts()
})

watch(payoutConfigRows, syncPayoutEdits, { immediate: true })
watch(specialRules, syncSpecialRuleEdits, { immediate: true })

onMounted(() => {
  void loadBets()
  void loadRooms()
  void loadPayoutConfigs()
  void loadSpecialPayoutRules()
  void loadSpecialPayouts()
})
</script>
