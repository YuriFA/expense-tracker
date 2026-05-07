import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
    },
    {
      path: '/transactions',
      component: () => import('@/pages/TransactionsPage.vue'),
    },
    {
      path: '/accounts',
      component: () => import('@/pages/accounts/AccountsPage.vue'),
    },
    {
      path: '/settings',
      component: () => import('@/pages/SettingsPage.vue'),
    },
  ],
})

export default router
