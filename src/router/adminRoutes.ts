// AdminRouteName is the stable page id used by the shell so navigation stays typed without vue-router.
export type AdminRouteName = 'dashboard' | 'members' | 'users' | 'game-bets' | 'audit' | 'game-records' | 'game-record-detail'

// AdminRoute describes one browser path and the sidebar metadata needed to render admin navigation.
export interface AdminRoute {
  name: AdminRouteName
  path: string
  label: string
  icon: string
  gameRoundId?: number
}

// adminRoutes drives the slide-in sidebar so labels, icons, and paths stay in one place.
export const adminRoutes: AdminRoute[] = [
  { name: 'dashboard', path: '/admin', label: 'Dashboard', icon: 'mdi:view-dashboard' },
  { name: 'members', path: '/admin/members', label: 'Members', icon: 'mdi:account-group' },
  { name: 'users', path: '/admin/users', label: 'Users', icon: 'mdi:account-circle' },
  { name: 'game-bets', path: '/admin/game-bets', label: 'Game Bet', icon: 'mdi:cash-multiple' },
  { name: 'audit', path: '/admin/audit', label: 'Audit', icon: 'mdi:clipboard-text-clock' },
  { name: 'game-records', path: '/admin/games', label: 'Games', icon: 'mdi:cards-playing' },
]

// fallbackRoute is used for unknown admin paths so direct browser entries land on a valid page.
export const fallbackRoute = adminRoutes[0]

// routeFromPath resolves the current browser path to a known admin route.
export const routeFromPath = (path: string): AdminRoute => {
  const normalizedPath = path.replace(/\/$/, '') || '/'
  const gameDetailMatch = normalizedPath.match(/^\/admin\/games\/(\d+)$/)
  if (gameDetailMatch) {
    return {
      name: 'game-record-detail',
      path: normalizedPath,
      label: 'Round Detail',
      icon: 'mdi:cards-playing',
      gameRoundId: Number(gameDetailMatch[1]),
    }
  }
  return adminRoutes.find((route) => route.path === normalizedPath) ?? fallbackRoute
}
