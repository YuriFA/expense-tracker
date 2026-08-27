import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/entities/session'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login').then((m) => m.LoginPage),
    meta: { public: true, redirectIfAuthed: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/register').then((m) => m.RegisterPage),
    meta: { public: true, redirectIfAuthed: true },
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('@/pages/verify-email').then((m) => m.VerifyEmailPage),
    meta: { public: true },
  },
  {
    // Invitation accept deep link (household-join design D6): public page
    // (no nav chrome), but NOT redirectIfAuthed - a signed-in visitor must
    // stay here to accept with their account.
    path: '/invite/:token',
    name: 'invite',
    component: () => import('@/pages/invite').then((m) => m.InvitePage),
    meta: { public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/reset-password').then((m) => m.ResetPasswordPage),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/dashboard').then((m) => m.DashboardPage),
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: () => import('@/pages/transactions').then((m) => m.TransactionsPage),
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: () => import('@/pages/analytics').then((m) => m.AnalyticsPage),
  },
  {
    path: '/analytics/:direction',
    name: 'analytics-detail',
    component: () => import('@/pages/analytics-detail').then((m) => m.AnalyticsDetailPage),
  },
  {
    path: '/debts',
    name: 'debts',
    component: () => import('@/pages/debts').then((m) => m.DebtsPage),
  },
  {
    path: '/plans',
    name: 'plans',
    component: () => import('@/pages/plans').then((m) => m.PlansPage),
  },
  {
    path: '/income',
    name: 'income',
    component: () => import('@/pages/income').then((m) => m.IncomePage),
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: () => import('@/pages/accounts').then((m) => m.AccountsPage),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/settings').then((m) => m.SettingsPage),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Anonymous-first (design D5): every route is public - data screens operate
// on local storage without a session, so there is no auth guard. Only the
// login/register entry points bounce already-authenticated users back into
// the app, which needs the one-time session restore to have finished.
router.beforeEach(async (to) => {
  if (!to.meta.redirectIfAuthed) return true

  const auth = useAuthStore()
  await auth.ensureRestored()
  if (auth.isAuthenticated) {
    return { name: 'home' }
  }
  return true
})

export default router
