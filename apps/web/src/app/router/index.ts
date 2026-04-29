import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/DashboardPage.vue'),
    },
    {
      path: '/transactions',
      component: () => import('@/pages/TransactionsPage.vue'),
    },
    {
      path: '/analytics',
      component: () => import('@/pages/AnalyticsPage.vue'),
    },
    {
      path: '/settings',
      component: () => import('@/pages/SettingsPage.vue'),
    },
  ],
})

export default router
