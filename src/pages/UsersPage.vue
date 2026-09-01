<template>
  <section class="flex h-full min-h-0 w-full flex-col">
    <header class="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
      <div class="flex items-center gap-3">
        <div class="admin-icon-tile h-10 w-10">
          <Icon icon="mdi:account-circle" class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-normal">Users</h1>
          <p class="text-sm text-slate-400">Create admin usernames and review operator access</p>
        </div>
      </div>

      <button class="admin-icon-button" title="Refresh" @click="loadUsers">
        <Icon icon="mdi:refresh" class="h-5 w-5" :class="{ 'animate-spin': loading }" />
      </button>
    </header>

    <section class="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form class="admin-panel min-h-0 overflow-auto p-4" @submit.prevent="submitUser">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="font-black">Create User</h2>
          <Icon icon="mdi:account-key" class="h-5 w-5 text-gold" />
        </div>

        <div class="grid gap-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">First</span>
              <input v-model.trim="form.first_name" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Last</span>
              <input v-model.trim="form.last_name" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" />
            </label>
          </div>

          <label class="block">
            <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Username</span>
            <input v-model.trim="form.user_name" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm uppercase outline-none ring-gold/40 focus:ring-2" autocomplete="off" />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Email</span>
            <input v-model.trim="form.email" type="email" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" />
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Password</span>
              <input v-model="form.password" type="password" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" autocomplete="new-password" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Confirm</span>
              <input v-model="form.password_confirm" type="password" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" autocomplete="new-password" />
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Role</span>
              <select v-model.number="form.role_id" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2">
                <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.user_role_name }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Phone</span>
              <input v-model.trim="form.phone_number" class="h-10 w-full rounded-md border border-white/10 bg-ink-800 px-3 text-sm outline-none ring-gold/40 focus:ring-2" />
            </label>
          </div>
        </div>

        <button class="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gold font-black text-ink-950 transition hover:brightness-105 disabled:opacity-60" :disabled="saving">
          <Icon :icon="saving ? 'mdi:loading' : 'mdi:content-save'" class="h-5 w-5" :class="{ 'animate-spin': saving }" />
          {{ saving ? 'Creating' : 'Create user' }}
        </button>
      </form>

      <section class="admin-panel flex min-h-0 flex-col overflow-hidden">
        <div v-if="loading" class="grid min-h-0 flex-1 place-items-center text-slate-400">
          <Icon icon="mdi:loading" class="mb-2 h-7 w-7 animate-spin text-gold" />
          Loading users
        </div>
        <div v-else-if="records.length === 0" class="grid min-h-0 flex-1 place-items-center text-slate-400">
          No users found
        </div>
        <div v-else class="min-h-0 flex-1 overflow-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead class="sticky top-0 z-10 bg-ink-800 text-xs uppercase text-slate-400">
              <tr>
                <th class="px-4 py-3 font-black">Username</th>
                <th class="px-4 py-3 font-black">Name</th>
                <th class="px-4 py-3 font-black">Role</th>
                <th class="px-4 py-3 font-black">Status</th>
                <th class="px-4 py-3 font-black">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.user_uuid" class="border-t border-white/10 hover:bg-white/[0.03]">
                <td class="px-4 py-3">
                  <strong class="block">{{ record.user_name }}</strong>
                  <span class="text-xs text-slate-500">{{ record.email }}</span>
                </td>
                <td class="px-4 py-3">{{ [record.first_name, record.last_name].filter(Boolean).join(' ') || '-' }}</td>
                <td class="px-4 py-3">{{ record.role_name || `Role ${record.role_id}` }}</td>
                <td class="px-4 py-3">
                  <span class="rounded bg-emerald-300/15 px-2 py-1 text-xs font-black text-emerald-200">{{ record.status_id === 1 ? 'Active' : 'Inactive' }}</span>
                </td>
                <td class="px-4 py-3 text-slate-300">{{ formatDate(record.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 p-3 text-sm text-slate-400">
          <span>Page {{ page }} · {{ total }} users</span>
          <div class="flex gap-2">
            <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="page <= 1" @click="page--">Previous</button>
            <button class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 font-bold text-slate-100 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">Next</button>
          </div>
        </footer>
      </section>
    </section>

    <p v-if="errorMessage" class="mt-3 shrink-0 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{{ errorMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { createAdminUser, getAdminUserCreateRoles, listAdminUsers, type AdminRole, type AdminUser, type CreateAdminUserRequest } from '../api/adminApi'

const emit = defineEmits<{
  // Stale sessions are delegated to the shell so token cleanup stays centralized.
  unauthenticated: []
}>()

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const records = ref<AdminUser[]>([])
const roles = ref<AdminRole[]>([])
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const form = reactive<CreateAdminUserRequest>(defaultUserForm())

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

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
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load users'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    loading.value = false
  }
}

// submitUser creates an admin operator and reloads the first page so the newest username is visible.
const submitUser = async (): Promise<void> => {
  errorMessage.value = ''
  saving.value = true
  try {
    await createAdminUser({ ...form, user_name: form.user_name.toUpperCase() })
    Object.assign(form, defaultUserForm())
    page.value = 1
    await loadUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to create user'
    if (String(errorMessage.value).includes('401')) emit('unauthenticated')
  } finally {
    saving.value = false
  }
}

// formatDate keeps user timestamps readable in the operator's browser locale.
const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

watch([page, perPage], () => {
  void loadUsers()
})

onMounted(() => {
  void loadUsers()
})
</script>
