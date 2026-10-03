<template>
  <section class="flex min-h-[calc(100vh-6.5rem)] w-full flex-col">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div class="flex items-center gap-3">
        <div class="admin-icon-tile h-10 w-10">
          <Icon icon="mdi:cash-multiple" class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-normal">Game Bet</h1>
          <p class="text-sm text-slate-400">Held, released, and settled round-bet ledger entries</p>
        </div>
      </div>

      <button class="admin-icon-button" title="Refresh" @click="refreshPage">
        <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': refreshingActiveTab }" />
      </button>
    </header>

    <nav class="admin-panel mb-4 flex flex-wrap gap-2 p-2">
      <button
        v-for="tab in gameTabs"
        :key="tab.name"
        class="flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold transition"
        :class="activeTab === tab.name ? 'border-gold bg-gold text-ink-950' : 'border-white/10 bg-ink-800 text-slate-200 hover:bg-ink-700'"
        @click="activeTab = tab.name"
      >
        <Icon :icon="tab.icon" class="h-5 w-5" />
        {{ tab.label }}
      </button>
    </nav>

    <section v-if="activeTab === 'overview'" class="mb-4 grid gap-3 sm:grid-cols-3">
      <div v-for="stat in stats" :key="stat.label" class="admin-panel p-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-400">{{ stat.label }}</span>
          <Icon :icon="stat.icon" class="h-5 w-5 text-gold" />
        </div>
        <strong class="text-2xl font-black">{{ stat.value }}</strong>
      </div>
    </section>

    <section v-if="activeTab === 'room-setup'" class="grid flex-1 gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <form class="admin-panel h-max p-4" @submit.prevent="editingRoomId ? saveRoom() : createRoom()">
        <div class="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 class="font-black">{{ editingRoomId ? 'Edit Room' : 'Create Room' }}</h2>
            <p class="text-sm text-slate-400">{{ editingRoomId ? 'New entry fee applies from the next round' : 'New entry fee with default payout configs' }}</p>
          </div>
          <Icon :icon="editingRoomId ? 'mdi:pencil' : 'mdi:door-open'" class="h-5 w-5 text-gold" />
        </div>

        <div class="grid gap-3">
          <label class="grid gap-1 text-sm font-bold text-slate-300">
            Room Code
            <input v-model.trim="roomForm.room_code" :disabled="Boolean(editingRoomId)" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2 disabled:opacity-60" placeholder="TL-011" />
            <span v-if="editingRoomId" class="text-xs font-normal text-slate-500">Room code can't be changed</span>
          </label>
          <label class="grid gap-1 text-sm font-bold text-slate-300">
            Room Name
            <input v-model.trim="roomForm.room_name" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2" placeholder="TienLen Room" />
          </label>
          <label class="grid gap-1 text-sm font-bold text-slate-300">
            Entry Fee
            <input v-model.number="roomForm.entry_fee" type="number" min="1" step="1" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2" placeholder="2000000" />
          </label>
          <template v-if="editingRoomId">
            <label class="grid gap-1 text-sm font-bold text-slate-300">
              Status
              <select v-model.number="roomForm.status_id" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2">
                <option :value="1">Active</option>
                <option :value="2">Inactive</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm font-bold text-slate-300">
              Order
              <input v-model.number="roomForm.order" type="number" min="1" step="1" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2" />
            </label>
          </template>
          <label v-else class="grid gap-1 text-sm font-bold text-slate-300">
            Turn Timeout
            <div class="relative">
              <Icon icon="mdi:timer-sand" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input v-model.number="roomForm.turn_timeout_seconds" type="number" min="3" max="300" step="1" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 pl-10 pr-16 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2" />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-slate-500">Sec</span>
            </div>
          </label>
          <button class="mt-2 flex h-10 items-center justify-center gap-2 rounded-md bg-gold px-4 text-sm font-black text-ink-950 disabled:opacity-50" :disabled="creatingRoom || savingRoom">
            <Icon :icon="creatingRoom || savingRoom ? 'mdi:loading' : (editingRoomId ? 'mdi:content-save' : 'mdi:plus')" class="h-5 w-5" :class="{ 'animate-spin': creatingRoom || savingRoom }" />
            {{ editingRoomId ? 'Save Room' : 'Create Room' }}
          </button>
          <button v-if="editingRoomId" type="button" class="flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-ink-900 px-4 text-sm font-black text-slate-100 hover:bg-ink-700" @click="cancelRoomEdit">
            Cancel
          </button>
        </div>
      </form>

      <div class="admin-panel overflow-hidden">
        <div class="border-b border-white/10 px-4 py-3">
          <h2 class="font-black">Configured Rooms</h2>
        </div>
        <div class="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
          <div v-for="room in rooms" :key="room.id" class="rounded-md border bg-ink-800 p-3" :class="editingRoomId === room.id ? 'border-gold/60' : 'border-white/10'">
            <div class="mb-1 flex items-center justify-between gap-3">
              <strong>{{ room.code || `Room ${room.id}` }}</strong>
              <span class="text-xs text-gold">{{ formatMoney(room.entry_fee) }}</span>
            </div>
            <div class="mb-3 flex items-center justify-between gap-2 text-xs text-slate-400">
              <span class="truncate">{{ room.name }} · #{{ room.sort_order }}</span>
              <span :class="room.status_id === 1 ? 'text-emerald-300' : 'text-slate-500'">{{ room.status_id === 1 ? 'Active' : 'Inactive' }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button class="flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-ink-900 px-3 text-xs font-black text-slate-100 transition hover:bg-ink-700" @click="startRoomEdit(room)">
                <Icon icon="mdi:pencil" class="h-4 w-4 text-gold" />
                Edit Room
              </button>
              <button class="flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-ink-900 px-3 text-xs font-black text-slate-100 transition hover:bg-ink-700" @click="editRoomTurnTimeout(room.id)">
                <Icon icon="mdi:timer-edit" class="h-4 w-4 text-gold" />
                Turn Timeout
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'turn-timeout'" class="grid flex-1 gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <div class="admin-panel h-max p-4">
        <div class="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 class="font-black">Turn Timeout</h2>
            <p class="text-sm text-slate-400">Future rounds use the saved room timer</p>
          </div>
          <Icon icon="mdi:timer-sand" class="h-5 w-5 text-gold" />
        </div>

        <div class="grid gap-3 text-sm text-slate-300">
          <div class="rounded-md border border-white/10 bg-ink-800 p-3">
            <span class="mb-1 block text-xs font-black uppercase text-slate-500">Allowed Range</span>
            <strong class="text-xl font-black text-slate-100">3-300 seconds</strong>
          </div>
          <div class="rounded-md border border-white/10 bg-ink-800 p-3">
            <span class="mb-1 block text-xs font-black uppercase text-slate-500">Configured Rooms</span>
            <strong class="text-xl font-black text-slate-100">{{ roomConfigurations.length.toLocaleString() }}</strong>
          </div>
          <p class="text-xs leading-5 text-slate-500">Saved values apply when a new game starts. Already-running Redis turn timers are not rewritten by this operation.</p>
        </div>
      </div>

      <div class="admin-panel min-h-0 overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <h2 class="font-black">Room Timing</h2>
            <p class="text-sm text-slate-400">Per-room operation control for player turn timeouts</p>
          </div>
          <button class="admin-icon-button" title="Refresh timing" @click="loadRoomConfigurations">
            <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': roomConfigurationLoading }" />
          </button>
        </div>

        <div v-if="roomConfigurationLoading" class="grid h-80 place-items-center text-slate-400">
          <Icon icon="mdi:loading" class="mb-2 h-7 w-7 animate-spin text-gold" />
          Loading room timing
        </div>
        <div v-else-if="roomConfigurations.length === 0" class="grid h-80 place-items-center text-slate-400">
          No room timing found
        </div>
        <div v-else class="overflow-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="sticky top-0 z-10 bg-ink-800 text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-3 font-black">Room</th>
                <th class="px-4 py-3 font-black">Timeout</th>
                <th class="px-4 py-3 font-black">Updated</th>
                <th class="px-4 py-3 font-black">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="config in roomConfigurations" :key="config.id" class="border-t border-white/10 hover:bg-white/[0.03]" :class="{ 'bg-gold/10': selectedRoomConfigurationId === config.room_id }">
                <td class="px-4 py-3">
                  <span class="block font-black">{{ config.room_code || `Room ${config.room_id}` }}</span>
                  <span class="text-xs text-slate-500">{{ config.room_name }}</span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="roomConfigurationEdits[config.room_id]" class="relative w-36">
                    <input v-model.number="roomConfigurationEdits[config.room_id].turnTimeoutSeconds" type="number" min="3" max="300" step="1" class="h-9 w-full rounded-md border border-white/10 bg-ink-800 px-3 pr-12 text-sm text-gold outline-none ring-gold/40 focus:ring-2" />
                    <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-slate-500">Sec</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-300">{{ formatDate(config.updated_at || config.created_at) }}</td>
                <td class="px-4 py-3">
                  <button class="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-ink-800 px-3 text-xs font-black text-slate-100 disabled:opacity-50" :disabled="savingRoomConfigurationId === config.room_id" @click="saveRoomConfiguration(config)">
                    <Icon :icon="savingRoomConfigurationId === config.room_id ? 'mdi:loading' : 'mdi:content-save'" class="h-4 w-4" :class="{ 'animate-spin': savingRoomConfigurationId === config.room_id }" />
                    Save
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'payout-config'" class="admin-panel min-h-0 flex-1 overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 class="font-black">Payout Config Percent</h2>
          <p class="text-sm text-slate-400">Room-based rake and rank distribution tied to each room entry fee</p>
        </div>
        <Icon icon="mdi:percent" class="h-5 w-5 text-gold" />
      </div>
      <div class="overflow-auto">
        <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead class="bg-ink-800 text-xs uppercase text-slate-400">
            <tr>
              <th class="px-4 py-3 font-black">Players</th>
              <th class="px-4 py-3 font-black">Room</th>
              <th class="px-4 py-3 font-black">Entry Fee</th>
              <th class="px-4 py-3 font-black">Rake</th>
              <th class="px-4 py-3 font-black">Rank 1</th>
              <th class="px-4 py-3 font-black">Rank 2</th>
              <th class="px-4 py-3 font-black">Rank 3</th>
              <th class="px-4 py-3 font-black">Rank 4</th>
              <th class="px-4 py-3 font-black">Action</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="config in payoutConfigRows" :key="config.key">
              <tr v-if="payoutEdits[config.key]" class="border-t border-white/10 hover:bg-white/[0.03]">
                <td class="px-4 py-3 font-black">{{ config.playerCount }}</td>
                <td class="px-4 py-3">
                  <span class="block font-black">{{ config.roomCode || `Room ${config.roomId}` }}</span>
                  <span class="text-xs text-slate-500">{{ config.roomName }}</span>
                </td>
                <td class="px-4 py-3">{{ formatMoney(config.entryFee) }}</td>
                <td class="px-4 py-3">
                  <input v-model.number="payoutEdits[config.key].rakePercent" type="number" min="0" max="99" step="0.01" class="h-9 w-20 rounded-md border border-white/10 bg-ink-800 px-2 text-sm text-gold outline-none ring-gold/40 focus:ring-2" />
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="payoutEdits[config.key].rankPercents[1]" type="number" min="0" max="100" step="0.01" class="h-9 w-20 rounded-md border border-white/10 bg-ink-800 px-2 text-sm outline-none ring-gold/40 focus:ring-2" />
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="payoutEdits[config.key].rankPercents[2]" type="number" min="0" max="100" step="0.01" class="h-9 w-20 rounded-md border border-white/10 bg-ink-800 px-2 text-sm outline-none ring-gold/40 focus:ring-2" />
                </td>
                <td class="px-4 py-3">
                  <input v-if="config.playerCount >= 3" v-model.number="payoutEdits[config.key].rankPercents[3]" type="number" min="0" max="100" step="0.01" class="h-9 w-20 rounded-md border border-white/10 bg-ink-800 px-2 text-sm outline-none ring-gold/40 focus:ring-2" />
                  <span v-else class="text-slate-600">-</span>
                </td>
                <td class="px-4 py-3">
                  <input v-if="config.playerCount >= 4" v-model.number="payoutEdits[config.key].rankPercents[4]" type="number" min="0" max="100" step="0.01" class="h-9 w-20 rounded-md border border-white/10 bg-ink-800 px-2 text-sm outline-none ring-gold/40 focus:ring-2" />
                  <span v-else class="text-slate-600">-</span>
                </td>
                <td class="px-4 py-3">
                  <button class="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-ink-800 px-3 text-xs font-black text-slate-100 disabled:opacity-50" :disabled="savingPayoutKey === config.key" @click="savePayoutConfig(config)">
                    <Icon :icon="savingPayoutKey === config.key ? 'mdi:loading' : 'mdi:content-save'" class="h-4 w-4" :class="{ 'animate-spin': savingPayoutKey === config.key }" />
                    Save
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="activeTab === 'special-payout'" class="grid flex-1 gap-4 xl:grid-cols-[minmax(420px,520px)_1fr]">
      <div class="admin-panel min-h-0 overflow-hidden">
        <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <h2 class="font-black">Special Payout Rules</h2>
            <p class="text-sm text-slate-400">Future settlement rules for cutting 2 cards</p>
          </div>
          <Icon icon="mdi:cards-playing-spade-multiple" class="h-5 w-5 text-gold" />
        </div>
        <div class="max-h-[38rem] overflow-auto p-3">
          <div v-if="specialRules.length === 0" class="grid h-44 place-items-center text-sm text-slate-400">
            No special payout rules found
          </div>
          <div v-for="rule in specialRules" :key="rule.id" class="mb-3 rounded-md border border-white/10 bg-ink-800 p-3">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <strong>{{ rule.room_code || `Room ${rule.room_id}` }}</strong>
                <p class="text-xs text-slate-400">{{ ruleLabel(rule.event_type) }} · {{ formatMoney(rule.entry_fee) }}</p>
              </div>
              <span class="rounded px-2 py-1 text-xs font-black" :class="rule.status_id === 1 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'">
                {{ rule.status_id === 1 ? 'Active' : 'Paused' }}
              </span>
            </div>

            <div v-if="specialRuleEdits[rule.id]" class="grid gap-3 sm:grid-cols-2">
              <label class="grid gap-1 text-xs font-bold text-slate-300">
                Payout Type
                <select v-model="specialRuleEdits[rule.id].payout_type" class="h-9 rounded-md border border-white/10 bg-ink-900 px-2 text-sm outline-none">
                  <option value="entry_fee_multiplier">Entry fee multiplier</option>
                  <option value="fixed_amount">Fixed amount</option>
                </select>
              </label>
              <label class="grid gap-1 text-xs font-bold text-slate-300">
                Value
                <input v-model.number="specialRuleEdits[rule.id].payout_value" type="number" min="0.01" step="0.01" class="h-9 rounded-md border border-white/10 bg-ink-900 px-2 text-sm outline-none ring-gold/40 focus:ring-2" />
              </label>
              <label class="grid gap-1 text-xs font-bold text-slate-300">
                Commission %
                <input v-model.number="specialRuleEdits[rule.id].commissionPercentInput" type="number" min="0" max="99" step="0.01" class="h-9 rounded-md border border-white/10 bg-ink-900 px-2 text-sm outline-none ring-gold/40 focus:ring-2" />
              </label>
              <label class="grid gap-1 text-xs font-bold text-slate-300">
                Status
                <select v-model.number="specialRuleEdits[rule.id].status_id" class="h-9 rounded-md border border-white/10 bg-ink-900 px-2 text-sm outline-none">
                  <option :value="1">Active</option>
                  <option :value="2">Paused</option>
                </select>
              </label>
            </div>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-slate-500">
                {{ partyLabel(rule.payer) }} pays {{ partyLabel(rule.receiver) }}
              </p>
              <button class="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-ink-900 px-3 text-xs font-black text-slate-100 disabled:opacity-50" :disabled="savingSpecialRuleId === rule.id" @click="saveSpecialRule(rule)">
                <Icon :icon="savingSpecialRuleId === rule.id ? 'mdi:loading' : 'mdi:content-save'" class="h-4 w-4" :class="{ 'animate-spin': savingSpecialRuleId === rule.id }" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="admin-panel min-h-0 overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <h2 class="font-black">Special Payout Ledger</h2>
            <p class="text-sm text-slate-400">Debits, commission, and net credits outside normal pot payout</p>
          </div>
          <select v-model.number="specialPerPage" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none">
            <option :value="10">10 rows</option>
            <option :value="20">20 rows</option>
            <option :value="50">50 rows</option>
          </select>
        </div>
        <div v-if="specialLoading" class="grid h-80 place-items-center text-slate-400">
          <Icon icon="mdi:loading" class="mb-2 h-7 w-7 animate-spin text-gold" />
          Loading special payouts
        </div>
        <div v-else-if="specialPayouts.length === 0" class="grid h-80 place-items-center text-slate-400">
          No special payouts found
        </div>
        <div v-else class="overflow-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="sticky top-0 z-10 bg-ink-800 text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-3 font-black">Ticket</th>
                <th class="px-4 py-3 font-black">Payer</th>
                <th class="px-4 py-3 font-black">Receiver</th>
                <th class="px-4 py-3 font-black">Gross</th>
                <th class="px-4 py-3 font-black">Commission</th>
                <th class="px-4 py-3 font-black">Net</th>
                <th class="px-4 py-3 font-black">Settled</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in specialPayouts" :key="record.id" class="border-t border-white/10 hover:bg-white/[0.03]">
                <td class="px-4 py-3">
                  <span class="block font-mono text-xs text-gold">{{ record.round_ticket }}</span>
                  <span class="block text-xs text-slate-400">{{ ruleLabel(record.event_type) }}</span>
                  <span class="text-xs text-slate-500">P{{ record.parent_room_id }} / I{{ record.inner_room_id }} · R{{ record.round_number }}</span>
                </td>
                <td class="px-4 py-3 font-black">#{{ record.payer_member_id }}</td>
                <td class="px-4 py-3 font-black">#{{ record.receiver_member_id }}</td>
                <td class="px-4 py-3 text-coral">{{ formatMoney(record.gross_amount) }}</td>
                <td class="px-4 py-3">{{ formatMoney(record.commission_amount) }}</td>
                <td class="px-4 py-3 text-emerald-300">{{ formatMoney(record.net_amount) }}</td>
                <td class="px-4 py-3 text-slate-300">{{ formatDate(record.settled_at || record.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm text-slate-400">
          <span>Page {{ specialPage }} · {{ specialTotal }} total special payouts</span>
          <div class="flex gap-2">
            <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="specialPage <= 1" @click="specialPage--">Previous</button>
            <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="specialPage >= specialTotalPages" @click="specialPage++">Next</button>
          </div>
        </footer>
      </div>
    </section>

    <section v-if="activeTab === 'bet-ledger'" class="admin-panel mb-4 flex flex-wrap items-center gap-3 p-3">
      <div class="relative min-w-64 flex-1">
        <Icon icon="mdi:magnify" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input v-model.trim="search" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 pl-10 pr-3 text-sm outline-none ring-gold/40 focus:ring-2" placeholder="Search ticket, hold key, member, status" />
      </div>
      <select v-model.number="perPage" class="h-10 rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none">
        <option :value="10">10 rows</option>
        <option :value="20">20 rows</option>
        <option :value="50">50 rows</option>
      </select>
    </section>

    <section v-if="activeTab === 'bet-ledger'" class="admin-panel min-h-0 flex-1 overflow-hidden">
      <div v-if="loading" class="grid h-80 place-items-center text-slate-400">
        <Icon icon="mdi:loading" class="mb-2 h-7 w-7 animate-spin text-gold" />
        Loading bets
      </div>
      <div v-else-if="filteredRecords.length === 0" class="grid h-80 place-items-center text-slate-400">
        No game bets found
      </div>
      <div v-else class="overflow-auto">
        <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead class="sticky top-0 z-10 bg-ink-800 text-xs uppercase text-slate-400">
            <tr>
              <th class="px-4 py-3 font-black">Ticket</th>
              <th class="px-4 py-3 font-black">Member</th>
              <th class="px-4 py-3 font-black">Room</th>
              <th class="px-4 py-3 font-black">Amount</th>
              <th class="px-4 py-3 font-black">Payout</th>
              <th class="px-4 py-3 font-black">Status</th>
              <th class="px-4 py-3 font-black">Created</th>
              <th class="px-4 py-3 font-black">Refund</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id" class="border-t border-white/10 hover:bg-white/[0.03]">
              <td class="px-4 py-3">
                <span class="block font-mono text-xs text-gold">{{ record.round_ticket || record.hold_key }}</span>
                <span class="text-xs text-slate-500">Round {{ record.round_number }}</span>
              </td>
              <td class="px-4 py-3 font-black">#{{ record.member_id }}</td>
              <td class="px-4 py-3">P{{ record.parent_room_id }} / I{{ record.inner_room_id }}</td>
              <td class="px-4 py-3">{{ formatMoney(record.amount) }}</td>
              <td class="px-4 py-3">{{ formatMoney(record.payout_amount) }}</td>
              <td class="px-4 py-3">
                <span class="rounded px-2 py-1 text-xs font-black" :class="statusClass(record.status)">
                  {{ statusLabel(record.status, record.result) }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-300">{{ formatDate(record.created_at) }}</td>
              <td class="px-4 py-3">
                <!-- Refund is offered only for escrowed bets; the game server still refuses it while the round is live. -->
                <span v-if="record.refund_request_status" class="mb-1 block w-max rounded px-2 py-1 text-xs font-black" :class="refundStatusClass(record.refund_request_status)" :title="record.refund_failure_reason || ''">
                  Refund {{ record.refund_request_status }}
                </span>
                <span v-if="record.refund_request_status === 'failed' && record.refund_failure_reason" class="mb-1 block max-w-56 text-xs text-coral">{{ record.refund_failure_reason }}</span>
                <button
                  v-if="canRequestRefund(record)"
                  class="flex h-8 items-center gap-1 rounded-md border border-coral/40 bg-coral/10 px-3 text-xs font-black text-coral transition hover:bg-coral/20"
                  @click="openRefundDialog(record)"
                >
                  <Icon icon="mdi:cash-refund" class="h-4 w-4" />
                  {{ record.refund_request_status === 'failed' ? 'Retry refund' : 'Refund' }}
                </button>
                <span v-else-if="!record.refund_request_status" class="text-xs text-slate-500">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Refund confirmation: a reason is required because this returns money outside the normal round flow. -->
    <div v-if="refundTarget" class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" @click.self="closeRefundDialog">
      <form class="admin-panel w-full max-w-md p-5" @submit.prevent="submitRefund">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="font-black">Refund bet</h2>
            <p class="text-sm text-slate-400">
              Member #{{ refundTarget.member_id }} · {{ formatMoney(refundTarget.amount) }} · P{{ refundTarget.parent_room_id }} / I{{ refundTarget.inner_room_id }} · Round {{ refundTarget.round_number }}
            </p>
          </div>
          <Icon icon="mdi:cash-refund" class="h-6 w-6 text-coral" />
        </div>
        <p class="mb-3 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
          The game server refuses a refund while this bet's round is still playing. Suspend the room with "Force stop" first, or wait for the round to end.
        </p>
        <label class="mb-4 grid gap-1 text-sm font-bold text-slate-300">
          Reason
          <textarea v-model="refundReason" rows="3" maxlength="255" class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-100 outline-none ring-gold/40 focus:ring-2" placeholder="Player was charged but the round never started" />
        </label>
        <p v-if="refundError" class="mb-3 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{{ refundError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="h-10 rounded-md border border-white/10 bg-ink-900 px-4 text-sm font-black text-slate-100 hover:bg-ink-700" @click="closeRefundDialog">Cancel</button>
          <button class="flex h-10 items-center gap-2 rounded-md bg-coral px-4 text-sm font-black text-ink-950 disabled:opacity-60" :disabled="refundSubmitting || !refundReason.trim()">
            <Icon :icon="refundSubmitting ? 'mdi:loading' : 'mdi:cash-refund'" class="h-4 w-4" :class="{ 'animate-spin': refundSubmitting }" />
            Confirm refund
          </button>
        </div>
      </form>
    </div>

    <section v-if="activeTab === 'overview'" class="grid flex-1 gap-4 lg:grid-cols-2">
      <div class="admin-panel overflow-hidden">
        <div class="border-b border-white/10 px-4 py-3">
          <h2 class="font-black">Recent Bets</h2>
        </div>
        <div class="overflow-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="bg-ink-800 text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-3 font-black">Ticket</th>
                <th class="px-4 py-3 font-black">Member</th>
                <th class="px-4 py-3 font-black">Amount</th>
                <th class="px-4 py-3 font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records.slice(0, 8)" :key="record.id" class="border-t border-white/10">
                <td class="px-4 py-3 font-mono text-xs text-gold">{{ record.round_ticket || record.hold_key }}</td>
                <td class="px-4 py-3 font-black">#{{ record.member_id }}</td>
                <td class="px-4 py-3">{{ formatMoney(record.amount) }}</td>
                <td class="px-4 py-3">{{ statusLabel(record.status, record.result) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel overflow-hidden">
        <div class="border-b border-white/10 px-4 py-3">
          <h2 class="font-black">Payout Rooms</h2>
        </div>
        <div class="grid gap-2 p-3 sm:grid-cols-2">
          <div v-for="room in payoutRoomSummaries" :key="room.roomId" class="rounded-md border border-white/10 bg-ink-800 p-3">
            <div class="mb-2 flex items-center justify-between gap-3">
              <strong>{{ room.roomCode || `Room ${room.roomId}` }}</strong>
              <span class="text-xs text-gold">{{ formatMoney(room.entryFee) }}</span>
            </div>
            <p class="mb-3 text-xs text-slate-400">{{ room.configCount }} payout rows configured</p>
            <button class="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-ink-900 px-3 text-xs font-black text-slate-100 transition hover:bg-ink-700" @click="editRoomTurnTimeout(room.roomId)">
              <Icon icon="mdi:timer-edit" class="h-4 w-4 text-gold" />
              Edit Turn Timeout
            </button>
          </div>
        </div>
      </div>
    </section>

    <footer v-if="activeTab === 'bet-ledger'" class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
      <span>Page {{ page }} · {{ total }} total bets</span>
      <div class="flex gap-2">
        <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="page <= 1" @click="page--">Previous</button>
        <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">Next</button>
      </div>
    </footer>
    <p v-if="errorMessage" class="mt-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{{ errorMessage }}</p>
    <p v-if="successMessage" class="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{{ successMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  createRoomWithPayoutConfigs,
  listGamePayoutConfigs,
  listGameRoundBets,
  listGameSpecialPayoutRules,
  listGameSpecialPayouts,
  listRoomConfigurations,
  listRooms,
  updateRoom,
  updateRoomConfiguration,
  updateRoomPayoutConfigs,
  updateRoomSpecialPayoutRule,
  requestBetRefund,
  apiErrorMessage,
  type BetRefundRequestStatus,
  type GamePayoutConfig,
  type GameRoundBet,
  type GameSpecialPayout,
  type GameSpecialPayoutRule,
  type Room,
  type RoomConfiguration,
} from '../api/adminApi'

const emit = defineEmits<{
  // Unauthorized loads are surfaced to the shell so it can clear auth and return to login.
  unauthenticated: []
}>()

const loading = ref(false)
const specialLoading = ref(false)
const roomConfigurationLoading = ref(false)
const creatingRoom = ref(false)
const savingPayoutKey = ref('')
const savingSpecialRuleId = ref(0)
const savingRoomConfigurationId = ref(0)
const errorMessage = ref('')
const successMessage = ref('')
const records = ref<GameRoundBet[]>([])
const payoutConfigs = ref<GamePayoutConfig[]>([])
const specialRules = ref<GameSpecialPayoutRule[]>([])
const specialPayouts = ref<GameSpecialPayout[]>([])
const roomConfigurations = ref<RoomConfiguration[]>([])
const rooms = ref<Room[]>([])
// editingRoomId switches the Room Setup form from "create" to "edit this room" (0 = creating).
const editingRoomId = ref(0)
const savingRoom = ref(false)
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const specialPage = ref(1)
const specialPerPage = ref(20)
const specialTotal = ref(0)
const search = ref('')
const activeTab = ref<GameTabName>('overview')
const selectedRoomConfigurationId = ref(0)
const roomForm = reactive({
  room_code: '',
  room_name: 'TienLen Room',
  entry_fee: 0,
  status_id: 1,
  order: 1,
  turn_timeout_seconds: 10,
})
const payoutEdits = ref<Record<string, PayoutEdit>>({})
const specialRuleEdits = ref<Record<number, SpecialRuleEdit>>({})
const roomConfigurationEdits = ref<Record<number, RoomConfigurationEdit>>({})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const specialTotalPages = computed(() => Math.max(1, Math.ceil(specialTotal.value / specialPerPage.value)))

type GameTabName = 'overview' | 'room-setup' | 'turn-timeout' | 'payout-config' | 'special-payout' | 'bet-ledger'

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

// RoomConfigurationEdit mirrors persisted room timing while giving admins a local editable draft.
interface RoomConfigurationEdit {
  turnTimeoutSeconds: number
}

// gameTabs defines the local game-area navigation as this page grows beyond one table.
const gameTabs: Array<{ name: GameTabName; label: string; icon: string }> = [
  { name: 'overview', label: 'Overview', icon: 'mdi:view-dashboard' },
  { name: 'room-setup', label: 'Room Setup', icon: 'mdi:door-open' },
  { name: 'turn-timeout', label: 'Turn Timeout', icon: 'mdi:timer-sand' },
  { name: 'payout-config', label: 'Payout Config', icon: 'mdi:percent' },
  { name: 'special-payout', label: 'Special Payout', icon: 'mdi:cards-playing-spade-multiple' },
  { name: 'bet-ledger', label: 'Bet Ledger', icon: 'mdi:cash-multiple' },
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
  { label: 'Total bets', value: total.value.toLocaleString(), icon: 'mdi:cash-multiple' },
  { label: 'Visible amount', value: formatMoney(records.value.reduce((sum, record) => sum + record.amount, 0)), icon: 'mdi:bank-transfer-out' },
  { label: 'Avg timeout', value: formatAverageTimeout(roomConfigurations.value), icon: 'mdi:timer-sand' },
])

// refreshingActiveTab keeps the shell refresh indicator tied to the current operation area.
const refreshingActiveTab = computed(() => {
  if (activeTab.value === 'turn-timeout') return roomConfigurationLoading.value
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

// syncRoomConfigurationEdits gives each room config an isolated draft so failed saves do not overwrite the table.
const syncRoomConfigurationEdits = (rows: RoomConfiguration[]): void => {
  const next: Record<number, RoomConfigurationEdit> = {}
  for (const config of rows) {
    next[config.room_id] = {
      turnTimeoutSeconds: config.turn_timeout_seconds,
    }
  }
  roomConfigurationEdits.value = next
}

// loadBets refreshes the current bet ledger page while preserving pagination choices.
const loadBets = async (): Promise<void> => {
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true
  try {
    const result = await listGameRoundBets(page.value, perPage.value)
    records.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load game bets'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
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
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load payout config'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  }
}

// loadSpecialPayoutRules reads room-level special payout configuration for admin editing.
const loadSpecialPayoutRules = async (): Promise<void> => {
  errorMessage.value = ''
  try {
    specialRules.value = await listGameSpecialPayoutRules()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load special payout rules'
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
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load special payouts'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    specialLoading.value = false
  }
}

// loadRoomConfigurations reads room-level timing settings used by future turn timers.
const loadRoomConfigurations = async (): Promise<void> => {
  errorMessage.value = ''
  roomConfigurationLoading.value = true
  try {
    roomConfigurations.value = await listRoomConfigurations()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load room timing'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    roomConfigurationLoading.value = false
  }
}

// loadRooms reads the parent rooms shown as Configured Rooms (name, fee, status, order).
const loadRooms = async (): Promise<void> => {
  try {
    rooms.value = await listRooms()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load rooms'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  }
}

// startRoomEdit fills the Room Setup form with one room so it can be edited in place.
const startRoomEdit = (room: Room): void => {
  errorMessage.value = ''
  successMessage.value = ''
  editingRoomId.value = room.id
  roomForm.room_code = room.code
  roomForm.room_name = room.name
  roomForm.entry_fee = room.entry_fee
  roomForm.status_id = room.status_id
  roomForm.order = room.sort_order
}

// cancelRoomEdit returns the form to "create room" with its defaults.
const cancelRoomEdit = (): void => {
  editingRoomId.value = 0
  roomForm.room_code = ''
  roomForm.room_name = 'TienLen Room'
  roomForm.entry_fee = 0
  roomForm.status_id = 1
  roomForm.order = 1
}

// saveRoom validates and saves the room being edited, then refreshes every list that shows room data
// (payout configs and timing rows carry the room's code/name/fee too).
const saveRoom = async (): Promise<void> => {
  errorMessage.value = ''
  successMessage.value = ''
  if (!roomForm.room_name.trim()) {
    errorMessage.value = 'Room name is required'
    return
  }
  if (roomForm.entry_fee <= 0) {
    errorMessage.value = 'Entry fee must be greater than zero'
    return
  }
  if (!Number.isInteger(roomForm.order) || roomForm.order <= 0) {
    errorMessage.value = 'Order must be a whole number greater than zero'
    return
  }

  savingRoom.value = true
  try {
    const saved = await updateRoom(editingRoomId.value, {
      room_name: roomForm.room_name.trim(),
      entry_fee: roomForm.entry_fee,
      status_id: roomForm.status_id,
      order: roomForm.order,
    })
    successMessage.value = `Room ${saved.code} updated`
    cancelRoomEdit()
    await Promise.all([loadRooms(), loadPayoutConfigs(), loadRoomConfigurations()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to update room'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    savingRoom.value = false
  }
}

// editRoomTurnTimeout moves operators from room cards directly to the matching turn-timeout control.
const editRoomTurnTimeout = (roomId: number): void => {
  selectedRoomConfigurationId.value = roomId
  activeTab.value = 'turn-timeout'
}

// createRoom creates a new entry-fee room and relies on the backend to seed the standard payout matrices.
const createRoom = async (): Promise<void> => {
  errorMessage.value = ''
  successMessage.value = ''
  if (!roomForm.room_code.trim()) {
    errorMessage.value = 'Room code is required'
    return
  }
  if (roomForm.entry_fee <= 0) {
    errorMessage.value = 'Entry fee must be greater than zero'
    return
  }
  if (!isValidTurnTimeout(roomForm.turn_timeout_seconds)) {
    errorMessage.value = 'Turn timeout must be between 3 and 300 seconds'
    return
  }

  creatingRoom.value = true
  try {
    const result = await createRoomWithPayoutConfigs({
      room_code: roomForm.room_code.trim(),
      room_name: roomForm.room_name.trim() || 'TienLen Room',
      entry_fee: roomForm.entry_fee,
      status_id: roomForm.status_id,
      turn_timeout_seconds: roomForm.turn_timeout_seconds,
    })
    roomForm.room_code = ''
    roomForm.entry_fee = 0
    successMessage.value = 'Room created with default payout configs'
    await Promise.all([loadRooms(), loadPayoutConfigs(), loadRoomConfigurations()])
    selectedRoomConfigurationId.value = result.room.id
    activeTab.value = 'turn-timeout'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to create room'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    creatingRoom.value = false
  }
}

// saveRoomConfiguration persists one room's turn timer while keeping running game state untouched.
const saveRoomConfiguration = async (config: RoomConfiguration): Promise<void> => {
  const edit = roomConfigurationEdits.value[config.room_id]
  if (!edit) return

  errorMessage.value = ''
  successMessage.value = ''
  const turnTimeoutSeconds = Number(edit.turnTimeoutSeconds)
  if (!isValidTurnTimeout(turnTimeoutSeconds)) {
    errorMessage.value = `${config.room_code || `Room ${config.room_id}`} timeout must be between 3 and 300 seconds`
    return
  }

  savingRoomConfigurationId.value = config.room_id
  try {
    await updateRoomConfiguration(config.room_id, {
      turn_timeout_seconds: turnTimeoutSeconds,
    })
    successMessage.value = 'Turn timeout saved'
    await loadRoomConfigurations()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to save room timing'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    savingRoomConfigurationId.value = 0
  }
}

// savePayoutConfig persists one room/player-count row after verifying rank percentages still total 100%.
const savePayoutConfig = async (row: PayoutConfigRow): Promise<void> => {
  const edit = payoutEdits.value[row.key]
  if (!edit) return

  errorMessage.value = ''
  successMessage.value = ''
  const ranks = Array.from({ length: row.playerCount }, (_, index) => index + 1)
  const totalPercent = ranks.reduce((sum, rank) => sum + Number(edit.rankPercents[rank] || 0), 0)
  if (Math.abs(totalPercent - 100) > 0.01) {
    errorMessage.value = `${row.roomCode || `Room ${row.roomId}`} / ${row.playerCount} players must total 100%`
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
    successMessage.value = 'Payout config saved'
    await loadPayoutConfigs()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to save payout config'
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
  successMessage.value = ''
  if (Number(edit.payout_value) <= 0) {
    errorMessage.value = 'Special payout value must be greater than zero'
    return
  }
  if (Number(edit.commissionPercentInput) < 0 || Number(edit.commissionPercentInput) >= 100) {
    errorMessage.value = 'Special commission must be between 0% and less than 100%'
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
    successMessage.value = 'Special payout rule saved'
    await loadSpecialPayoutRules()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to save special payout rule'
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
    await Promise.all([loadRooms(), loadPayoutConfigs(), loadRoomConfigurations()])
    return
  }
  if (activeTab.value === 'turn-timeout') {
    await loadRoomConfigurations()
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
  await Promise.all([loadBets(), loadPayoutConfigs(), loadRoomConfigurations(), loadSpecialPayoutRules(), loadSpecialPayouts()])
}

// formatDate keeps ledger timestamps readable in the operator's browser locale.
const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

// formatMoney normalizes numeric bet values so finance columns stay aligned.
const formatMoney = (value: number): string => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// percentInput keeps percentage fields readable while preserving two decimals when admins need finer control.
const percentInput = (value = 0): number => Number((value * 100).toFixed(2))

// decimalFromPercent converts UI percentage input back into the backend settlement share format.
const decimalFromPercent = (value = 0): number => Number((Number(value || 0) / 100).toFixed(4))

// isValidTurnTimeout mirrors backend room-timer bounds so operators get immediate feedback before submit.
const isValidTurnTimeout = (value: number): boolean => Number.isInteger(Number(value)) && Number(value) >= 3 && Number(value) <= 300

// formatAverageTimeout summarizes configured room timing without implying it controls already-running rounds.
const formatAverageTimeout = (rows: RoomConfiguration[]): string => {
  if (rows.length === 0) return '-'
  const average = rows.reduce((sum, row) => sum + row.turn_timeout_seconds, 0) / rows.length
  return `${Math.round(average)} sec`
}

// statusLabel combines status and result because settled bets need both finance and outcome context.
const statusLabel = (status: string, result: string): string => {
  if (result) return `${status} / ${result}`
  return status || '-'
}

// statusClass makes held, settled, released, and failed states easy to scan in the table.
const statusClass = (status: string): string => {
  if (status === 'settled') return 'bg-emerald-400/15 text-emerald-300'
  if (status === 'released') return 'bg-slate-500/15 text-slate-300'
  if (status === 'failed') return 'bg-coral/15 text-coral'
  return 'bg-gold/15 text-gold'
}

// ruleLabel turns backend event keys into short admin labels without hiding the configured value.
const ruleLabel = (eventType: string): string => {
  if (eventType === 'beat_single_2') return 'Beat single 2'
  if (eventType === 'beat_pair_2') return 'Beat pair of 2s'
  return eventType || '-'
}

// partyLabel keeps money movement roles readable in the special payout editor.
const partyLabel = (value: string): string => {
  if (value === 'beaten_player') return 'Beaten player'
  if (value === 'beating_player') return 'Beating player'
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
    // loadBets clears page messages, so the confirmation is set after each reload.
    const confirmation = result.commandWarning || `Refund requested for member #${target.member_id}`
    await loadBets()
    successMessage.value = confirmation
    window.setTimeout(async () => {
      await loadBets()
      successMessage.value = confirmation
    }, REFUND_STATUS_REFRESH_MS)
  } catch (error) {
    refundError.value = apiErrorMessage(error, 'Unable to request refund')
    if (refundError.value.includes('401')) emit('unauthenticated')
  } finally {
    refundSubmitting.value = false
  }
}

// refundStatusClass colors the refund badge: waiting (gold), completed (green), refused (coral).
const refundStatusClass = (status: BetRefundRequestStatus): string => {
  if (status === 'done') return 'bg-emerald-400/15 text-emerald-300'
  if (status === 'failed') return 'bg-coral/15 text-coral'
  return 'bg-gold/15 text-gold'
}

watch([page, perPage], () => {
  void loadBets()
})

watch([specialPage, specialPerPage], () => {
  void loadSpecialPayouts()
})

watch(payoutConfigRows, syncPayoutEdits, { immediate: true })
watch(specialRules, syncSpecialRuleEdits, { immediate: true })
watch(roomConfigurations, syncRoomConfigurationEdits, { immediate: true })

onMounted(() => {
  void loadBets()
  void loadRooms()
  void loadPayoutConfigs()
  void loadRoomConfigurations()
  void loadSpecialPayoutRules()
  void loadSpecialPayouts()
})
</script>
