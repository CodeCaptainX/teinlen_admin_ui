import { createRouter, createWebHistory } from 'vue-router'
import adminRoutes from './router/adminRoutes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...adminRoutes,
    {
      path: '/:pathMatch(.*)*',
      redirect: '/admin',
    },
  ],
})

export default router
