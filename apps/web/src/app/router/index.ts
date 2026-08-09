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

// Restore the session once, then guard protected routes. Authenticated routes
// require a valid session; unauthenticated entry points (login/register) bounce
// signed-in users back to the app.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.isReady) {
    await auth.fetchMe()
  }

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.redirectIfAuthed && auth.isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

export default router
