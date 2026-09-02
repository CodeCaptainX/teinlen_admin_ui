<template>
  <main class="admin-app">
    <section v-if="!isAuthenticated" class="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
      <div class="relative hidden min-h-screen overflow-hidden border-r border-white/10 bg-ink-900 px-10 py-10 lg:flex lg:flex-col">
        <div class="flex items-center gap-3">
          <div class="admin-icon-tile h-12 w-12">
            <Icon icon="mdi:shield-crown" class="h-6 w-6" />
          </div>
          <div>
            <strong class="block text-xl font-black">Tien Len Admin</strong>
            <span class="text-sm text-slate-400">{{ apiBaseUrl }}</span>
          </div>
        </div>

        <div class="flex flex-1 items-center">
          <div class="max-w-2xl">
            <span class="mb-4 inline-flex rounded-md border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-black uppercase text-gold">Control Panel</span>
            <h1 class="mb-5 text-5xl font-black leading-tight tracking-normal text-slate-50">Manage game records without losing the table context.</h1>
            <p class="max-w-xl text-base leading-7 text-slate-400">Sign in to review games, members, users, and betting activity from one full-screen admin workspace.</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div v-for="metric in loginMetrics" :key="metric.label" class="rounded-lg border border-white/10 bg-ink-800 p-4">
            <Icon :icon="metric.icon" class="mb-3 h-5 w-5 text-gold" />
            <strong class="block text-sm font-black">{{ metric.label }}</strong>
            <span class="text-xs text-slate-400">{{ metric.value }}</span>
          </div>
        </div>
      </div>

      <div class="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <form class="w-full max-w-md" @submit.prevent="submitLogin">
          <div class="admin-panel relative overflow-hidden p-5 sm:p-6">
            <div v-if="loginLoading" class="absolute inset-0 z-10 grid place-items-center bg-ink-950/75 backdrop-blur-sm">
              <div class="text-center">
                <Icon icon="mdi:loading" class="mx-auto mb-3 h-8 w-8 animate-spin text-gold" />
                <strong class="block font-black">Signing in</strong>
                <span class="text-sm text-slate-400">Checking admin credentials</span>
              </div>
            </div>

            <div class="mb-6 flex items-center gap-3 lg:hidden">
              <div class="admin-icon-tile h-11 w-11">
                <Icon icon="mdi:shield-crown" class="h-5 w-5" />
              </div>
              <div>
                <h1 class="text-xl font-black">Tien Len Admin</h1>
                <p class="text-sm text-slate-400">{{ apiBaseUrl }}</p>
              </div>
            </div>

            <div class="mb-6">
              <span class="mb-2 block text-xs font-black uppercase text-gold">Admin Access</span>
              <h2 class="text-2xl font-black tracking-normal">Sign in</h2>
              <p class="mt-1 text-sm text-slate-400">Use your admin credentials to continue.</p>
            </div>

            <label class="mb-3 block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Username</span>
              <div class="relative">
                <Icon icon="mdi:account" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input v-model.trim="loginForm.username" class="h-12 w-full rounded-md border border-white/10 bg-ink-800 pl-10 pr-3 text-sm outline-none ring-gold/40 transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-gold/50 focus:ring-2" autocomplete="username" :disabled="loginLoading" />
              </div>
            </label>

            <label class="mb-5 block">
              <span class="mb-1 block text-xs font-bold uppercase text-slate-400">Password</span>
              <div class="relative">
                <Icon icon="mdi:lock" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input v-model="loginForm.password" type="password" class="h-12 w-full rounded-md border border-white/10 bg-ink-800 pl-10 pr-3 text-sm outline-none ring-gold/40 transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-gold/50 focus:ring-2" autocomplete="current-password" :disabled="loginLoading" />
              </div>
            </label>

            <button class="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gold font-black text-ink-950 transition hover:brightness-105 disabled:opacity-60" :disabled="loginLoading">
              <Icon :icon="loginLoading ? 'mdi:loading' : 'mdi:login'" class="h-5 w-5" :class="{ 'animate-spin': loginLoading }" />
              {{ loginLoading ? 'Signing in' : 'Sign in' }}
            </button>

            <p v-if="errorMessage" class="mt-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">{{ errorMessage }}</p>
          </div>
        </form>
      </div>
    </section>

    <section v-else class="admin-content relative">
      <nav class="admin-panel mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div class="flex items-center gap-3">
          <button class="admin-icon-button" title="Open sidebar" @click="openSidebar">
            <Icon icon="mdi:menu" class="h-5 w-5" />
          </button>
          <strong class="text-lg font-black">Tien Len Admin</strong>
        </div>

        <div class="flex items-center gap-2">
          <span class="rounded-md border border-white/10 bg-ink-800 px-3 py-2 text-sm font-bold text-slate-300">{{ activeRoute.label }}</span>
          <button class="admin-icon-button" title="Logout" @click="logout">
            <Icon icon="mdi:logout" class="h-5 w-5" />
          </button>
        </div>
      </nav>

      <button
        v-if="sidebarOpen"
        class="absolute inset-0 z-30 bg-black/60"
        title="Close sidebar"
        @click="closeSidebar"
      />

      <aside
        class="absolute inset-y-0 left-0 z-40 flex w-[var(--admin-sidebar-width)] max-w-[calc(100vw-2rem)] flex-col border-r border-white/10 bg-ink-900 p-4 shadow-panel transition-transform duration-200"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="mb-6 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="admin-icon-tile h-10 w-10">
              <Icon icon="mdi:shield-crown" class="h-5 w-5" />
            </div>
            <div>
              <strong class="block font-black">Tien Len Admin</strong>
              <span class="text-xs text-slate-400">Control panel</span>
            </div>
          </div>
          <button class="admin-icon-button" title="Close sidebar" @click="closeSidebar">
            <Icon icon="mdi:close" class="h-5 w-5" />
          </button>
        </div>

        <div class="flex flex-1 flex-col gap-2">
          <button
            v-for="route in adminRoutes"
            :key="route.name"
            class="admin-nav-button"
            :class="{ 'admin-nav-button-active': route.name === activeRoute.name }"
            @click="navigate(route.path)"
          >
            <Icon :icon="route.icon" class="h-5 w-5 shrink-0" />
            <span>{{ route.label }}</span>
          </button>
        </div>

        <button class="admin-nav-button mt-4" @click="logout">
          <Icon icon="mdi:logout" class="h-5 w-5 shrink-0" />
          <span>Logout</span>
        </button>
      </aside>

      <div class="admin-page-scroll">
        <RouterView v-slot="{ Component }">
          <component
            :is="Component"
            :game-round-id="activeRoute.gameRoundId || 0"
            @navigate="navigate"
            @unauthenticated="handleUnauthenticated"
          />
        </RouterView>
      </div>
    </section>

    <ToastBar :toasts="toasts" @dismiss="dismissToast" />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { ADMIN_AUTH_EXPIRED_EVENT, apiBaseUrl, clearStoredToken, getStoredToken, loginAdmin } from './api/adminApi'
import ToastBar, { type ToastKind, type ToastMessage } from './components/ToastBar.vue'
import { routeFromPath, sidebarRoutes } from './router/adminRoutes'

const route = useRoute()
const router = useRouter()
const loginForm = reactive({ username: '', password: '' })
const loginLoading = ref(false)
const errorMessage = ref('')
const isAuthenticated = ref(Boolean(getStoredToken()))
const sidebarOpen = ref(false)
const toastId = ref(0)
const toasts = ref<ToastMessage[]>([])

const activeRoute = computed(() => routeFromPath(route.path))
const adminRoutes = sidebarRoutes
// loginMetrics keeps the unauthenticated screen aligned with the major admin work areas.
const loginMetrics = [
  { label: 'Games', value: 'Records', icon: 'mdi:cards-playing' },
  { label: 'Members', value: 'Profiles', icon: 'mdi:account-group' },
  { label: 'Bets', value: 'Ledger', icon: 'mdi:cash-multiple' },
]

// submitLogin exchanges credentials for a bearer token and leaves routing in the current admin path.
const submitLogin = async (): Promise<void> => {
  errorMessage.value = ''
  loginLoading.value = true
  try {
    await loginAdmin(loginForm.username, loginForm.password)
    isAuthenticated.value = true
    await normalizeCurrentRoute()
    showToast('success', 'Signed in', 'Admin session is ready.')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Login failed'
    showToast('error', 'Login failed', errorMessage.value)
  } finally {
    loginLoading.value = false
  }
}

// navigate updates browser history so each admin page can be opened directly or refreshed.
const navigate = async (path: string): Promise<void> => {
  const nextRoute = routeFromPath(path)
  await router.push(nextRoute.path)
  closeSidebar()
}

// logout clears the stored token and returns the shell to the login form without changing history.
const logout = (): void => {
  clearStoredToken()
  isAuthenticated.value = false
  errorMessage.value = ''
  closeSidebar()
  showToast('info', 'Signed out', 'Admin token was cleared.')
}

// handleUnauthenticated centralizes stale-token cleanup for pages that receive a backend 401.
const handleUnauthenticated = (): void => {
  clearStoredToken()
  isAuthenticated.value = false
  closeSidebar()
  errorMessage.value = 'Session expired. Sign in again.'
  showToast('error', 'Session expired', 'Sign in again to continue.')
}

// openSidebar exposes the absolute overlay menu without shifting page content.
const openSidebar = (): void => {
  sidebarOpen.value = true
}

// closeSidebar hides the overlay menu after navigation, logout, or backdrop clicks.
const closeSidebar = (): void => {
  sidebarOpen.value = false
}

// showToast replaces the current toast so notifications never stack or push each other.
const showToast = (kind: ToastKind, title: string, message?: string): void => {
  const id = toastId.value + 1
  toastId.value = id
  toasts.value = [{ id, kind, title, message }]
  window.setTimeout(() => dismissToast(id), 4000)
}

// dismissToast removes a toast by id while preserving any newer notifications.
const dismissToast = (id: number): void => {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

// normalizeCurrentRoute lets Vue Router own fallback cleanup for direct browser entries.
const normalizeCurrentRoute = async (): Promise<void> => {
  const nextRoute = routeFromPath(route.path)
  if (nextRoute.path !== route.path) {
    await router.replace(nextRoute.path)
  }
}

// handleAuthExpired reacts to global API interceptor events from invalid or expired admin sessions.
const handleAuthExpired = (): void => {
  handleUnauthenticated()
}

onMounted(() => {
  void normalizeCurrentRoute()
  window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired)
})

onBeforeUnmount(() => {
  window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired)
})
</script>
