import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/dashboard').then((m) => m.DashboardPage),
    },
    {
      path: '/transactions',
      component: () => import('@/pages/transactions').then((m) => m.TransactionsPage),
    },
    {
      path: '/accounts',
      component: () => import('@/pages/accounts').then((m) => m.AccountsPage),
    },
    {
      path: '/settings',
      component: () => import('@/pages/settings').then((m) => m.SettingsPage),
    },
  ],
})

export default router
