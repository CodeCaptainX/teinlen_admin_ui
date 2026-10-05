<template>
  <div class="grid gap-4">
    <PageHeader :title="t('members.title')" :description="t('members.description')">
      <template #actions>
        <RefreshButton :loading="loading" @click="loadMembers" />
        <Button @click="openCreate">
          <UserPlusIcon />
          {{ t('members.create') }}
        </Button>
      </template>
    </PageHeader>

    <ErrorAlert :message="errorMessage" />

    <DataPanel :loading="loading" :empty="records.length === 0" :empty-title="t('members.noneFound')" :empty-icon="UsersIcon" :empty-text="t('members.emptyText')">
      <template #toolbar>
        <SearchInput v-model="search" :placeholder="t('members.searchPlaceholder')" />
      </template>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('col.username') }}</TableHead>
            <TableHead>{{ t('col.nickname') }}</TableHead>
            <TableHead>{{ t('col.limits') }}</TableHead>
            <TableHead>{{ t('col.status') }}</TableHead>
            <TableHead>{{ t('col.created') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="record in records" :key="record.id">
            <TableCell>
              <span class="block font-medium">{{ record.login_id }}</span>
              <span class="text-xs text-muted-foreground">#{{ record.id }}</span>
            </TableCell>
            <TableCell>
              <span class="block">{{ record.nickname || '-' }}</span>
              <span class="text-xs text-muted-foreground">{{ record.phone || '-' }}</span>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground">
              <span class="block">{{ t('members.limitsBet', { min: formatNumber(record.min_bet), max: formatNumber(record.max_bet) }) }}</span>
              <span class="block">{{ t('members.limitsWin', { max: formatNumber(record.max_win) }) }}</span>
            </TableCell>
            <TableCell><StatusBadge :view="activeStatusView(record.is_active)" /></TableCell>
            <TableCell class="text-muted-foreground">{{ formatDate(record.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <template #footer>
        <PaginationBar v-model:page="page" v-model:per-page="perPage" :total="total" :item-label="t('items.members')" />
      </template>
    </DataPanel>

    <!-- Create member opens in a dialog so the member table can use the full page width. -->
    <Dialog v-model:open="createOpen">
      <DialogContent class="bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{{ t('members.create') }}</DialogTitle>
          <DialogDescription>{{ t('members.dialogDescription') }}</DialogDescription>
        </DialogHeader>

        <form id="create-member-form" class="grid gap-4" @submit.prevent="submitMember">
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField id="member-login" :label="t('members.username')">
              <Input id="member-login" v-model.trim="form.login_id" class="uppercase" autocomplete="off" required />
            </FormField>
            <FormField id="member-password" :label="t('members.password')">
              <Input id="member-password" v-model="form.password" type="password" autocomplete="new-password" required />
            </FormField>
            <FormField id="member-nickname" :label="t('members.nickname')">
              <Input id="member-nickname" v-model.trim="form.nickname" />
            </FormField>
            <FormField id="member-phone" :label="t('members.phone')">
              <Input id="member-phone" v-model.trim="form.phone" />
            </FormField>
          </div>

          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField v-for="field in limitFields" :id="`member-${field.key}`" :key="field.key" :label="t(field.label)">
              <Input :id="`member-${field.key}`" v-model.number="form[field.key]" type="number" min="0" step="1" />
            </FormField>
          </div>

          <FormField id="member-remark" :label="t('members.remark')">
            <Input id="member-remark" v-model.trim="form.remark" />
          </FormField>

          <ErrorAlert :message="formError" />
        </form>

        <DialogFooter>
          <Button variant="outline" :disabled="saving" @click="createOpen = false">{{ t('common.cancel') }}</Button>
          <Button type="submit" form="create-member-form" :disabled="saving">
            <Loader2Icon v-if="saving" class="animate-spin" />
            {{ saving ? t('common.creating') : t('members.create') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Loader2Icon, UserPlusIcon, UsersIcon } from '@lucide/vue'
import { apiErrorMessage, createMember, listMembers, type CreateMemberRequest, type Member } from '@/api/adminApi'
import DataPanel from '@/components/admin/DataPanel.vue'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import FormField from '@/components/admin/FormField.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import PaginationBar from '@/components/admin/PaginationBar.vue'
import RefreshButton from '@/components/admin/RefreshButton.vue'
import SearchInput from '@/components/admin/SearchInput.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatNumber } from '@/lib/format'
import { t, type MessageKey } from '@/i18n/adminLanguage'
import { activeStatusView } from '@/lib/status'

const emit = defineEmits<{
  // Stale sessions are delegated to the shell so token cleanup stays centralized.
  unauthenticated: []
}>()

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
// createOpen shows the Create member dialog; formError keeps create failures inside the dialog next to the form.
const createOpen = ref(false)
const formError = ref('')
const records = ref<Member[]>([])
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const search = ref('')
const form = reactive<CreateMemberRequest>(defaultMemberForm())

// limitFields defines editable numeric member controls without duplicating form markup.
const limitFields: Array<{ key: keyof Pick<CreateMemberRequest, 'min_bet' | 'max_bet' | 'max_win' | 'max_draw' | 'max_money' | 'max_game'>; label: MessageKey }> = [
  { key: 'min_bet', label: 'members.minBet' },
  { key: 'max_bet', label: 'members.maxBet' },
  { key: 'max_win', label: 'members.maxWin' },
  { key: 'max_draw', label: 'members.maxDraw' },
  { key: 'max_money', label: 'members.maxMoney' },
  { key: 'max_game', label: 'members.maxGame' },
]

// defaultMemberForm gives new members explicit account defaults that match the database lifecycle fields.
function defaultMemberForm(): CreateMemberRequest {
  return {
    login_id: '',
    password: '',
    nickname: '',
    phone: '',
    currency_id: 1,
    language_id: 1,
    role_id: 1,
    min_bet: 0,
    max_bet: 0,
    max_win: 0,
    max_draw: 0,
    max_money: 0,
    max_game: 0,
    remark: '',
  }
}

// loadMembers refreshes the searchable member table while preserving the current page controls.
const loadMembers = async (): Promise<void> => {
  errorMessage.value = ''
  loading.value = true
  try {
    const result = await listMembers(page.value, perPage.value, search.value)
    records.value = result.records
    total.value = result.total
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('members.loadFailed'))
    if (errorMessage.value.includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// openCreate starts a fresh Create member form in the dialog.
const openCreate = (): void => {
  Object.assign(form, defaultMemberForm())
  formError.value = ''
  createOpen.value = true
}

// submitMember creates a member, closes the dialog, and reloads the first page so the new username is visible.
// On failure the dialog stays open with the API's reason so the admin can fix the field and retry.
const submitMember = async (): Promise<void> => {
  formError.value = ''
  saving.value = true
  try {
    const loginId = form.login_id.toUpperCase()
    await createMember({ ...form, login_id: loginId })
    createOpen.value = false
    toast.success(t('members.created', { name: loginId }))
    if (page.value === 1) await loadMembers()
    else page.value = 1
  } catch (error) {
    formError.value = apiErrorMessage(error, t('members.createFailed'))
    if (formError.value.includes('401')) emit('unauthenticated')
  } finally {
    saving.value = false
  }
}

watch([page, perPage], () => {
  void loadMembers()
})

watch(search, () => {
  if (page.value === 1) void loadMembers()
  else page.value = 1
})

onMounted(() => {
  void loadMembers()
})
</script>
