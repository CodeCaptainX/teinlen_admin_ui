import type { RouteRecordRaw } from 'vue-router'

// AdminRoute keeps sidebar metadata beside the matching Vue Router route so manual and router navigation stay aligned.
export type AdminRoute = RouteRecordRaw & {
  label: string
  icon: string
  path: string
  name: string
}

export type ActiveAdminRoute = AdminRoute & {
  gameRoundId?: number
}

export const adminRoutes: AdminRoute[] = [
  {
    path: '/admin',
    name: 'dashboard',
    label: 'Dashboard',
    icon: 'mdi:view-dashboard',
    component: () => import('@/pages/AdminDashboardPage.vue'),
  },
  {
    path: '/admin/users',
    name: 'users',
    label: 'Users',
    icon: 'mdi:account-circle',
    component: () => import('@/pages/UsersPage.vue'),
  },
  {
    path: '/admin/members',
    name: 'members',
    label: 'Members',
    icon: 'mdi:account-group',
    component: () => import('@/pages/MembersPage.vue'),
  },
  {
    path: '/admin/games',
    name: 'game-records',
    label: 'Games',
    icon: 'mdi:cards-playing',
    component: () => import('@/pages/GameRecordsPage.vue'),
  },
  {
    path: '/admin/games/:id',
    name: 'game-record-detail',
    label: 'Round Detail',
    icon: 'mdi:cards-playing',
    component: () => import('@/pages/GameRecordDetailPage.vue'),
  },
  {
    path: '/admin/game-bets',
    name: 'game-bets',
    label: 'Game Bet',
    icon: 'mdi:cash-multiple',
    component: () => import('@/pages/GameBetsPage.vue'),
  },
  {
    // Maintenance: suspend the website, all games, or one room (tbl_game_suspensions).
    path: '/admin/maintenance',
    name: 'maintenance',
    label: 'Maintenance',
    icon: 'mdi:tools',
    component: () => import('@/pages/SuspensionsPage.vue'),
  },
  {
    path: '/admin/audit',
    name: 'audit',
    label: 'Audit',
    icon: 'mdi:clipboard-text-clock',
    component: () => import('@/pages/AuditPage.vue'),
  },
]

// sidebarRoutes excludes parameterized detail pages that are reached from list rows rather than the main menu.
export const sidebarRoutes = adminRoutes.filter((route) => !route.path.includes(':'))

// routeFromPath normalizes direct browser URLs into the small active-route object used by the admin shell.
export function routeFromPath(path: string): ActiveAdminRoute {
  const normalizedPath = normalizePath(path)
  const gameRecordMatch = normalizedPath.match(/^\/admin\/games\/(\d+)$/)
  if (gameRecordMatch) {
    const detailRoute = adminRoutes.find((route) => route.name === 'game-record-detail')
    if (detailRoute) {
      return {
        ...detailRoute,
        path: normalizedPath,
        gameRoundId: Number(gameRecordMatch[1]),
      }
    }
  }

  return adminRoutes.find((route) => route.path === normalizedPath) || adminRoutes[0]
}

// normalizePath strips query/hash fragments and trailing slashes so refreshes never produce blank screens.
function normalizePath(path: string): string {
  const cleanPath = path.split(/[?#]/)[0] || '/'
  if (cleanPath.length > 1) {
    return cleanPath.replace(/\/+$/, '')
  }
  return cleanPath
}

export default adminRoutes
