# routes.md — router & pages (apps/web)

`vue-router` `createWebHistory`, single flat config at `apps/web/src/app/router/index.ts`. **No auth guard** — anonymous-first (local-first storage); only `login`/`register` have `meta.redirectIfAuthed` (bounce to `/`). `meta.public` routes render full-screen without the nav.

| Path | Name | Page component | Notes |
|---|---|---|---|
| `/login` | login | `src/pages/login` → LoginPage | public, redirectIfAuthed |
| `/register` | register | `src/pages/register` → RegisterPage | public, redirectIfAuthed |
| `/verify-email` | verify-email | `src/pages/verify-email` → VerifyEmailPage | public |
| `/invite/:token` | invite | `src/pages/invite` → InvitePage | public, no nav chrome, deep-link |
| `/reset-password` | reset-password | `src/pages/reset-password` → ResetPasswordPage | public |
| `/` | home | `src/pages/dashboard` → DashboardPage | **landing for anon AND authed** |
| `/transactions` | transactions | `src/pages/transactions` → TransactionsPage | list + filters sheet + add tabs |
| `/analytics` | analytics | `src/pages/analytics` → AnalyticsPage | overview donut + breakdown |
| `/analytics/:direction` | analytics-detail | `src/pages/analytics-detail` → AnalyticsDetailPage | per-direction detail |
| `/debts` | debts | `src/pages/debts` → DebtsPage | debtors + operations history |
| `/plans` | plans | `src/pages/plans` → PlansPage | planned payments, confirm → transaction |
| `/income` | income | `src/pages/income` → IncomePage | quick income entry |
| `/accounts` | accounts | `src/pages/accounts` → AccountsPage | account cards + create dialog |
| `/settings` | settings | `src/pages/settings` → SettingsPage | locale, household mgmt, session |

Full router source:

```ts
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
```

## Page summaries (design-relevant)

- **Dashboard `/`** — 2-col grid (md): NetWorthCard (total balance big number + per-account rows), QuickActionsCard (3 outline buttons with colored icon tiles: expense→Dialog CashflowForm, transfer→Dialog TransferForm, income→link /income), RecentTransactionsCard full-width (last 5 TransactionListItem with per-row kebab edit/delete dialogs).
- **Transactions** — filter chips + filters Sheet (accounts/categories/date RangeCalendar), tabs or segmented add (AddTransactionTabs: expense/income/transfer), list of TransactionListItem, pagination/load-more.
- **Analytics** — period navigation, donut (DonutChart + ChartLegend), category breakdown list with amounts/percentages, direction tabs (expenses/income) linking to detail.
- **Debts** — debtors list with derived balances, operation history per debtor, add-debtor/add-operation dialogs.
- **Plans** — planned payments list (amount, recurrence, next due, overdue marked), confirm→creates transaction, create/edit dialogs.
- **Income** — standalone quick income form page.
- **Accounts** — AccountCard list (letter avatar colored from `--avatar-color-N` by name hash, balance, kebab rename/delete-guarded), create dialog.
- **Settings** — locale switch, household section (create/invite/join, members, display name), theme stub, session (email, sign out).
- **Auth pages** — centered narrow card forms (vee-validate + zod, Field/Input/Button), full-screen without nav.
