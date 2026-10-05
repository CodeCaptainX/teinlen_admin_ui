<template>
  <div class="grid gap-4">
    <PageHeader :title="t('users.title')" :description="t('users.description')">
      <template #actions>
        <RefreshButton :loading="loading" @click="loadUsers" />
        <Button @click="openCreate">
          <UserPlusIcon />
          {{ t('users.create') }}
        </Button>
      </template>
    </PageHeader>

    <ErrorAlert :message="errorMessage" />

    <DataPanel :loading="loading" :empty="records.length === 0" :empty-title="t('users.noneFound')" :empty-icon="UserCogIcon">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('col.username') }}</TableHead>
            <TableHead>{{ t('col.name') }}</TableHead>
            <TableHead>{{ t('col.role') }}</TableHead>
            <TableHead>{{ t('col.status') }}</TableHead>
            <TableHead>{{ t('col.created') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="record in records" :key="record.user_uuid">
            <TableCell>
              <span class="block font-medium">{{ record.user_name }}</span>
              <span class="text-xs text-muted-foreground">{{ record.email }}</span>
            </TableCell>
            <TableCell>{{ [record.first_name, record.last_name].filter(Boolean).join(' ') || '-' }}</TableCell>
            <TableCell>{{ record.role_name || t('users.roleFallback', { id: record.role_id }) }}</TableCell>
            <TableCell><StatusBadge :view="activeStatusView(record.status_id === 1)" /></TableCell>
            <TableCell class="text-muted-foreground">{{ formatDate(record.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <template #footer>
        <PaginationBar v-model:page="page" v-model:per-page="perPage" :total="total" :item-label="t('items.users')" />
      </template>
    </DataPanel>

    <!-- Create user opens in a dialog so the user table can use the full page width. -->
    <Dialog v-model:open="createOpen">
      <DialogContent class="bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{{ t('users.create') }}</DialogTitle>
          <DialogDescription>{{ t('users.dialogDescription') }}</DialogDescription>
        </DialogHeader>

        <form id="create-user-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="submitUser">
          <FormField id="user-first" :label="t('users.firstName')">
            <Input id="user-first" v-model.trim="form.first_name" />
          </FormField>
          <FormField id="user-last" :label="t('users.lastName')">
            <Input id="user-last" v-model.trim="form.last_name" />
          </FormField>
          <FormField id="user-name" :label="t('users.username')">
            <Input id="user-name" v-model.trim="form.user_name" class="uppercase" autocomplete="off" required />
          </FormField>
          <FormField id="user-email" :label="t('users.email')">
            <Input id="user-email" v-model.trim="form.email" type="email" />
          </FormField>
          <FormField id="user-password" :label="t('users.password')">
            <Input id="user-password" v-model="form.password" type="password" autocomplete="new-password" required />
          </FormField>
          <FormField id="user-password-confirm" :label="t('users.confirmPassword')">
            <Input id="user-password-confirm" v-model="form.password_confirm" type="password" autocomplete="new-password" required />
          </FormField>
          <FormField id="user-role" :label="t('users.role')">
            <NativeSelect id="user-role" v-model.number="form.role_id" class="w-full">
              <NativeSelectOption v-for="role in roles" :key="role.id" :value="role.id">{{ role.user_role_name }}</NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField id="user-phone" :label="t('users.phone')">
            <Input id="user-phone" v-model.trim="form.phone_number" />
          </FormField>

          <div class="sm:col-span-2">
            <ErrorAlert :message="formError" />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" :disabled="saving" @click="createOpen = false">{{ t('common.cancel') }}</Button>
          <Button type="submit" form="create-user-form" :disabled="saving">
            <Loader2Icon v-if="saving" class="animate-spin" />
            {{ saving ? t('common.creating') : t('users.create') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Loader2Icon, UserCogIcon, UserPlusIcon } from '@lucide/vue'
import {
  apiErrorMessage,
  createAdminUser,
  getAdminUserCreateRoles,
  listAdminUsers,
  type AdminRole,
  type AdminUser,
  type CreateAdminUserRequest,
} from '@/api/adminApi'
import DataPanel from '@/components/admin/DataPanel.vue'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import FormField from '@/components/admin/FormField.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import PaginationBar from '@/components/admin/PaginationBar.vue'
import RefreshButton from '@/components/admin/RefreshButton.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { t } from '@/i18n/adminLanguage'
import { activeStatusView } from '@/lib/status'

const emit = defineEmits<{
  // Stale sessions are delegated to the shell so token cleanup stays centralized.
  unauthenticated: []
}>()

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
// createOpen shows the Create user dialog; formError keeps create failures inside the dialog next to the form.
const createOpen = ref(false)
const formError = ref('')
const records = ref<AdminUser[]>([])
const roles = ref<AdminRole[]>([])
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const form = reactive<CreateAdminUserRequest>(defaultUserForm())

// defaultUserForm provides required backend fields so creates do not rely on hidden UI state.
function defaultUserForm(): CreateAdminUserRequest {
  return {
    first_name: '',
    last_name: '',
    user_name: '',
    password: '',
    password_confirm: '',
    email: '',
    role_id: roles.value[0]?.id || 1,
    phone_number: '',
    commission: 0,
  }
}

// loadUsers refreshes operators and role choices needed by the create form.
const loadUsers = async (): Promise<void> => {
  errorMessage.value = ''
  loading.value = true
  try {
    const [userResult, roleResult] = await Promise.all([
      listAdminUsers(page.value, perPage.value),
      roles.value.length ? Promise.resolve(roles.value) : getAdminUserCreateRoles(),
    ])
    records.value = userResult.records
    total.value = userResult.total
    roles.value = roleResult
    if (!roles.value.some((role) => role.id === form.role_id)) {
      form.role_id = roles.value[0]?.id || 1
    }
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('users.loadFailed'))
    if (errorMessage.value.includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// openCreate starts a fresh Create user form in the dialog.
const openCreate = (): void => {
  Object.assign(form, defaultUserForm())
  formError.value = ''
  createOpen.value = true
}

// submitUser creates an admin operator, closes the dialog, and reloads the first page so the new user is
// visible. On failure the dialog stays open with the API's reason so the admin can fix the field and retry.
const submitUser = async (): Promise<void> => {
  formError.value = ''
  saving.value = true
  try {
    const userName = form.user_name.toUpperCase()
    await createAdminUser({ ...form, user_name: userName })
    createOpen.value = false
    toast.success(t('users.created', { name: userName }))
    if (page.value === 1) await loadUsers()
    else page.value = 1
  } catch (error) {
    formError.value = apiErrorMessage(error, t('users.createFailed'))
    if (formError.value.includes('401')) emit('unauthenticated')
  } finally {
    saving.value = false
  }
}

watch([page, perPage], () => {
  void loadUsers()
})

onMounted(() => {
  void loadUsers()
})
</script>
