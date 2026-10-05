<template>
  <!-- Signed out: login screen. -->
  <main v-if="!isAuthenticated" class="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.15fr_0.85fr]">
    <div class="relative hidden min-h-screen flex-col border-r bg-card px-10 py-10 lg:flex">
      <div class="flex items-center gap-3">
        <div class="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheckIcon class="size-5" />
        </div>
        <div>
          <strong class="block text-lg font-semibold">{{ t('common.appName') }}</strong>
          <span class="text-sm text-muted-foreground">{{ apiBaseUrl }}</span>
        </div>
      </div>

      <div class="flex flex-1 items-center">
        <div class="max-w-2xl">
          <Badge variant="outline" class="mb-4 border-primary/40 bg-primary/10 text-primary">{{ t('login.badge') }}</Badge>
          <h1 class="mb-5 text-5xl font-semibold leading-tight tracking-tight">{{ t('login.headline') }}</h1>
          <p class="max-w-xl text-base leading-7 text-muted-foreground">{{ t('login.intro') }}</p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div v-for="metric in loginMetrics" :key="metric.label" class="rounded-lg border bg-muted p-4">
          <component :is="metric.icon" class="mb-3 size-5 text-primary" />
          <strong class="block text-sm font-semibold">{{ t(metric.label) }}</strong>
          <span class="text-xs text-muted-foreground">{{ t(metric.value) }}</span>
        </div>
      </div>
    </div>

    <div class="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <form class="relative w-full max-w-md overflow-hidden rounded-xl border bg-card p-6" @submit.prevent="submitLogin">
        <div class="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div class="mb-6 flex items-center gap-3 lg:hidden">
          <div class="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheckIcon class="size-5" />
          </div>
          <div>
            <h1 class="text-lg font-semibold">{{ t('common.appName') }}</h1>
            <p class="text-sm text-muted-foreground">{{ apiBaseUrl }}</p>
          </div>
        </div>

        <div class="mb-6">
          <span class="mb-2 block text-xs font-medium uppercase tracking-wide text-primary">{{ t('login.access') }}</span>
          <h2 class="text-2xl font-semibold tracking-tight">{{ t('login.title') }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{{ t('login.subtitle') }}</p>
        </div>

        <div class="grid gap-4">
          <FormField id="login-username" :label="t('login.username')">
            <div class="relative">
              <UserIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="login-username" v-model.trim="loginForm.username" class="h-11 pl-9" autocomplete="username" :disabled="loginLoading" />
            </div>
          </FormField>
          <FormField id="login-password" :label="t('login.password')">
            <div class="relative">
              <LockIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="login-password" v-model="loginForm.password" type="password" class="h-11 pl-9" autocomplete="current-password" :disabled="loginLoading" />
            </div>
          </FormField>
          <Button type="submit" size="lg" class="h-11 w-full" :disabled="loginLoading">
            <Loader2Icon v-if="loginLoading" class="animate-spin" />
            <LogInIcon v-else />
            {{ loginLoading ? t('login.submitting') : t('login.submit') }}
          </Button>
          <ErrorAlert :message="errorMessage" />
        </div>
      </form>
    </div>
  </main>

  <!-- Signed in: top bar, slide-out menu, and the current page. -->
  <main v-else class="flex h-screen w-full flex-col overflow-hidden bg-background">
    <nav class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
      <div class="flex items-center gap-3">
        <Button variant="outline" size="icon" :aria-label="t('common.openMenu')" @click="sidebarOpen = true">
          <MenuIcon />
        </Button>
        <strong class="text-base font-semibold">{{ t('common.appName') }}</strong>
      </div>

      <div class="flex items-center gap-2">
        <LanguageSwitcher />
        <!-- Live indicator: pages refresh themselves on game server events while this is green. -->
        <span class="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium" :title="liveIndicator.title">
          <span class="size-2 rounded-full" :class="liveIndicator.dotClass" />
          {{ liveIndicator.label }}
        </span>
        <span class="hidden rounded-md border px-3 py-1.5 text-sm text-muted-foreground sm:inline">{{ navLabel(activeRoute.name) }}</span>
        <Button variant="outline" size="icon" :title="t('common.logout')" :aria-label="t('common.logout')" @click="logout">
          <LogOutIcon />
        </Button>
      </div>
    </nav>

    <Sheet v-model:open="sidebarOpen">
      <SheetContent side="left" class="w-72 gap-0 bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader class="border-b border-sidebar-border p-4">
          <SheetTitle class="flex items-center gap-3 text-left">
            <span class="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheckIcon class="size-4" />
            </span>
            <span>
              <span class="block text-sm font-semibold text-foreground">{{ t('common.appName') }}</span>
              <span class="block text-xs font-normal text-muted-foreground">{{ t('common.controlPanel') }}</span>
            </span>
          </SheetTitle>
          <SheetDescription class="sr-only">{{ t('common.navigation') }}</SheetDescription>
        </SheetHeader>

        <div class="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <button
            v-for="route in adminRoutes"
            :key="route.name"
            class="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors"
            :class="route.name === activeRoute.name ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'"
            @click="navigate(route.path)"
          >
            <component :is="navIcon(route.name)" class="size-4 shrink-0" />
            <span>{{ navLabel(route.name) }}</span>
          </button>
        </div>

        <div class="border-t border-sidebar-border p-3">
          <button class="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent" @click="logout">
            <LogOutIcon class="size-4 shrink-0" />
            <span>{{ t('common.logout') }}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
      <RouterView v-slot="{ Component }">
        <component
          :is="Component"
          :game-round-id="activeRoute.gameRoundId || 0"
          @navigate="navigate"
          @unauthenticated="handleUnauthenticated"
        />
      </RouterView>
    </div>
  </main>

  <!-- One global toaster for every page's confirmations and errors. -->
  <Toaster position="top-right" rich-colors close-button theme="dark" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Component } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  CoinsIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  LockIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SpadeIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
} from '@lucide/vue'
import 'vue-sonner/style.css'
import { ADMIN_AUTH_EXPIRED_EVENT, apiBaseUrl, apiErrorMessage, clearStoredToken, getStoredToken, loginAdmin } from './api/adminApi'
import { connectAdminLive, disconnectAdminLive, useAdminLiveStatus } from './api/adminLive'
import ErrorAlert from '@/components/admin/ErrorAlert.vue'
import LanguageSwitcher from '@/components/admin/LanguageSwitcher.vue'
import FormField from '@/components/admin/FormField.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import { t, type MessageKey } from '@/i18n/adminLanguage'
import { routeFromPath, sidebarRoutes } from './router/adminRoutes'

const route = useRoute()
const router = useRouter()
const loginForm = reactive({ username: '', password: '' })
const loginLoading = ref(false)
const errorMessage = ref('')
const isAuthenticated = ref(Boolean(getStoredToken()))
const sidebarOpen = ref(false)

const activeRoute = computed(() => routeFromPath(route.path))
const adminRoutes = sidebarRoutes
const liveStatus = useAdminLiveStatus()

// NAV_ICONS gives each menu entry its icon by route name, so the menu uses the same icon set as the pages.
const NAV_ICONS: Record<string, Component> = {
  dashboard: LayoutDashboardIcon,
  users: UserCogIcon,
  members: UsersIcon,
  'game-records': SpadeIcon,
  'game-bets': CoinsIcon,
  maintenance: WrenchIcon,
  audit: ScrollTextIcon,
}

// navIcon falls back to the dashboard icon for routes added later without an entry above.
const navIcon = (name: string): Component => NAV_ICONS[name] || LayoutDashboardIcon

// NAV_LABELS translates menu entries by route name; adminRoutes keeps English labels for code readers.
const NAV_LABELS: Record<string, MessageKey> = {
  dashboard: 'nav.dashboard',
  users: 'nav.users',
  members: 'nav.members',
  'game-records': 'nav.gameRecords',
  'game-record-detail': 'nav.roundDetail',
  'game-bets': 'nav.gameBets',
  maintenance: 'nav.maintenance',
  audit: 'nav.audit',
}

// navLabel shows the translated menu label, falling back to the route's English label for new routes.
const navLabel = (name: string): string => {
  const key = NAV_LABELS[name]
  return key ? t(key) : sidebarRoutes.find((route) => route.name === name)?.label || name
}

// liveIndicator explains the connection state in plain words; "Offline" means pages only update on refresh.
const liveIndicator = computed(() => {
  if (liveStatus.value === 'live') return { label: t('live.live'), dotClass: 'bg-success', title: t('live.liveTitle') }
  if (liveStatus.value === 'connecting') return { label: t('live.connecting'), dotClass: 'bg-warning animate-pulse', title: t('live.connectingTitle') }
  return { label: t('live.offline'), dotClass: 'bg-destructive', title: t('live.offlineTitle') }
})

// loginMetrics keeps the unauthenticated screen aligned with the major admin work areas (message keys).
const loginMetrics: Array<{ label: MessageKey; value: MessageKey; icon: Component }> = [
  { label: 'login.metricGames', value: 'login.metricGamesValue', icon: SpadeIcon },
  { label: 'login.metricMembers', value: 'login.metricMembersValue', icon: UsersIcon },
  { label: 'login.metricBets', value: 'login.metricBetsValue', icon: CoinsIcon },
]

// submitLogin exchanges credentials for a bearer token and leaves routing in the current admin path.
const submitLogin = async (): Promise<void> => {
  errorMessage.value = ''
  loginLoading.value = true
  try {
    await loginAdmin(loginForm.username, loginForm.password)
    isAuthenticated.value = true
    await normalizeCurrentRoute()
    toast.success(t('session.signedIn'), { description: t('session.signedInDesc') })
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, t('login.failed'))
  } finally {
    loginLoading.value = false
  }
}

// navigate updates browser history so each admin page can be opened directly or refreshed.
const navigate = async (path: string): Promise<void> => {
  const nextRoute = routeFromPath(path)
  await router.push(nextRoute.path)
  sidebarOpen.value = false
}

// logout clears the stored token and returns the shell to the login form without changing history.
const logout = (): void => {
  clearStoredToken()
  isAuthenticated.value = false
  errorMessage.value = ''
  sidebarOpen.value = false
  toast.info(t('session.signedOut'), { description: t('session.signedOutDesc') })
}

// handleUnauthenticated centralizes stale-token cleanup for pages that receive a backend 401.
const handleUnauthenticated = (): void => {
  clearStoredToken()
  isAuthenticated.value = false
  sidebarOpen.value = false
  errorMessage.value = t('session.expiredMessage')
  toast.error(t('session.expired'), { description: t('session.expiredDesc') })
}

// normalizeCurrentRoute lets Vue Router own fallback cleanup for direct browser entries.
const normalizeCurrentRoute = async (): Promise<void> => {
  const nextRoute = routeFromPath(route.path)
  if (nextRoute.path !== route.path) {
    await router.replace(nextRoute.path)
  }
}

// The live connection follows the session: open after sign-in (or on load with a stored token), close on
// logout or expiry so a signed-out tab does not keep reconnecting with a dead token.
watch(
  isAuthenticated,
  (signedIn) => {
    if (signedIn) connectAdminLive()
    else disconnectAdminLive()
  },
  { immediate: true },
)

onMounted(() => {
  void normalizeCurrentRoute()
  window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleUnauthenticated)
})

onBeforeUnmount(() => {
  window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleUnauthenticated)
})
</script>
