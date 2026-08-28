# layouts.md — app shell & layout components (apps/web)

Current shell: a **top horizontal navbar** (`AppNav.vue`) over a centered single-column main (`max-w-5xl`), no sidebar. Auth pages (`meta.public`) render full-screen without nav. Global dialog hosts ride at the shell level.

- `App.vue` — root: ProgressProvider (route progress) + AppShell + global Toaster.
- `AppShell.vue` — composition root: BootGate wrapper, AppNav (hidden on public routes), `<main>` RouterView, global hosts (OwnershipGateDialog, HouseholdChoiceDialog, ConflictCenter), provides the sync controller (FSD composition root — needs auth store + household join store).
- `AppNav.vue` — one-row top nav: ghost-button RouterLinks (Dashboard, Transactions, Analytics, Debts, Plans, Accounts, Settings) with `active-class="bg-accent"`; right side: SyncStatusBadge + user email + Sign out (authed) or guest Badge + Sign in (anonymous).
- `BootGate.vue` — full-screen splash while the local SQLite/OPFS worker boots; single-tab busy banner with reload.
- `RouteProgress.ts` + `src/bprogress.css` — top loading bar (`--bprogress-color: var(--foreground)`).

Full sources follow.

### `apps/web/src/App.vue`
```vue
<script setup lang="ts">
import { ProgressProvider } from '@bprogress/vue'
import AppShell from '@/app/layout/AppShell.vue'
import RouteProgress from '@/app/layout/RouteProgress'
import { Toaster } from '@/shared/ui/sonner'
import 'vue-sonner/style.css'
import './bprogress.css'
</script>

<template>
  <ProgressProvider :disable-style="true" :options="{ showSpinner: false }">
    <RouteProgress />
    <AppShell />
    <Toaster />
  </ProgressProvider>
</template>
```


### `apps/web/src/main.ts`
```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'

import App from './App.vue'
import i18n from './shared/i18n'
import router from './app/router'
import { provideRepositories } from './app/repositories'
import { setUnauthorizedHandler } from './shared/api'
import { useAuthStore } from './entities/session'
import './style.css'
import { setupI18nLocaleWatcher } from './app/setup-i18n-locale-watcher'
import { registerServiceWorker } from './app/register-service-worker'

const app = createApp(App)
const pinia = createPinia()

app.use(i18n)
app.use(pinia)
app.use(PiniaColada, {
  queryOptions: {
    gcTime: 300_000, // 5 minutes, the default
    staleTime: 30_000, // SWR: don't refetch on remount within 30s
  },
  plugins: [
    PiniaColadaRetry({
      retry: 2,
      delay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
    }),
  ],
})
app.use(router)
provideRepositories(app)

// Session restore runs once at startup and is network-tolerant (design D5):
// a 401 or an unreachable backend both land in the anonymous shell - the app
// keeps working on local data.
void useAuthStore(pinia).ensureRestored()

// 401 interceptor: when an authenticated request loses its session mid-flight,
// drop local auth state - the app continues anonymously on local data (no
// relocation: every route is public) and the sync engine pauses itself until
// the next successful login. Unauthenticated calls (login/register/me before
// sign-in) handle UnauthorizedError themselves and the auth store is empty
// then, so this is a no-op for them.
setUnauthorizedHandler(() => {
  const auth = useAuthStore(pinia)
  if (auth.isAuthenticated) {
    auth.clearSession()
  }
})

setupI18nLocaleWatcher()
app.mount('#app')

// The app-shell service worker exists only in production builds; in dev its
// /sw.js would 404 (vite-plugin-pwa emits nothing without devOptions).
if (import.meta.env.PROD) registerServiceWorker()
```


### `apps/web/src/app/layout/AppShell.vue`
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from './AppNav.vue'
import BootGate from './BootGate.vue'
import { OwnershipGateDialog, useAuthStore } from '@/entities/session'
import { ConflictCenter } from '@/features/sync-conflicts'
import { HouseholdChoiceDialog, useHouseholdJoinStore } from '@/features/household-join'
import { provideSyncController } from '@/shared/lib/local-db'

const route = useRoute()
// Auth entry points (login/register/verify/reset) render full-screen without
// the app navigation.
const showNav = computed(() => !route.meta.public)

// The sync controller is composed here (the FSD composition root): it needs
// the auth state (entities) and provides itself down to the badge/conflict
// center (widgets/features) via shared/lib/sync. The household gate rides the
// same injection - shared/lib must not import entities/features, so AppShell
// closes over the join store (household-join design D7).
const auth = useAuthStore()
const householdJoin = useHouseholdJoinStore()
provideSyncController({
  isAuthenticated: () => auth.isAuthenticated,
  ensureHouseholdCurrent: () => householdJoin.ensureCurrentHousehold(),
})
</script>

<template>
  <BootGate>
    <div class="min-h-screen">
      <AppNav v-if="showNav" />

      <main class="mx-auto max-w-5xl px-4 py-6">
        <RouterView />
      </main>

      <!-- Global hosts: the ownership gate can trigger from any auth flow;
           the household choice from any join/leave/startup-mismatch flow;
           the conflict center opens from the sync badge on any screen. -->
      <OwnershipGateDialog />
      <HouseholdChoiceDialog />
      <ConflictCenter />
    </div>
  </BootGate>
</template>
```


### `apps/web/src/app/layout/AppNav.vue`
```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { computed } from 'vue'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { SyncStatusBadge } from '@/widgets/sync-status'
import { useAuthStore } from '@/entities/session'
import { notification } from '@/shared/services/notification'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const navItems = computed(() => [
  { to: '/', label: t('nav.dashboard') },
  { to: '/transactions', label: t('nav.transactions') },
  { to: '/analytics', label: t('nav.analytics') },
  { to: '/debts', label: t('nav.debts') },
  { to: '/plans', label: t('nav.plans') },
  { to: '/accounts', label: t('nav.accounts') },
  { to: '/settings', label: t('nav.settings') },
])

async function signOut() {
  await auth.logout()
  notification.success(t('auth.signedOut'))
  // Logout keeps local data and the anonymous mode usable: stay right here
  // instead of relocating to the login page.
}

function goToLogin() {
  void router.push({ name: 'login' })
}
</script>

<template>
  <nav class="border-b backdrop-blur">
    <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
      <Button v-for="item in navItems" :key="item.to" as-child variant="ghost">
        <RouterLink
          :to="item.to"
          class="transition hover:bg-accent"
          active-class="bg-accent hover:bg-accent/70"
        >
          {{ item.label }}
        </RouterLink>
      </Button>

      <div v-if="auth.isAuthenticated" class="ml-auto flex items-center gap-3">
        <SyncStatusBadge />
        <span class="text-sm text-muted-foreground">
          {{ t('auth.signedInAs') }} {{ auth.user?.email }}
        </span>
        <Button variant="ghost" @click="signOut">{{ t('auth.signOut') }}</Button>
      </div>

      <div v-else class="ml-auto flex items-center gap-3">
        <!-- Anonymous (local) mode indicator: everything works on local data;
             sign-in only adds server sync. -->
        <Badge variant="secondary" data-testid="guest-mode-indicator">
          {{ t('auth.guestMode') }}
        </Badge>
        <Button variant="ghost" @click="goToLogin">{{ t('auth.signIn') }}</Button>
      </div>
    </div>
  </nav>
</template>
```


### `apps/web/src/app/layout/BootGate.vue`
```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLocalDbBootState } from '@/shared/lib/local-db'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

// Boot state machine of the local database (design D2): splash while the
// worker opens OPFS/SQLite (tens of ms), the single-tab banner when another
// tab holds the Web Lock (design D3), and the app itself only once ready.
const { t } = useI18n()
const bootState = useLocalDbBootState()

function reload() {
  window.location.reload()
}
</script>

<template>
  <slot v-if="bootState === 'ready'" />

  <div
    v-else-if="bootState === 'booting'"
    class="flex min-h-screen items-center justify-center"
    data-testid="local-db-booting"
  >
    <div class="flex items-center gap-3 text-muted-foreground">
      <Spinner class="size-5" />
      <span class="text-sm">{{ t('boot.loading') }}</span>
    </div>
  </div>

  <div
    v-else
    class="flex min-h-screen items-center justify-center p-6"
    data-testid="local-db-busy"
  >
    <div class="max-w-md space-y-4 text-center">
      <h1 class="text-lg font-semibold">{{ t('boot.busyTitle') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('boot.busyDescription') }}</p>
      <Button @click="reload">{{ t('boot.reload') }}</Button>
    </div>
  </div>
</template>
```


### `apps/web/src/app/layout/RouteProgress.ts`
```ts
import { defineComponent, onBeforeUnmount } from 'vue'
import { useProgress } from '@bprogress/vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'RouteProgress',
  setup() {
    const router = useRouter()
    const { start, stop } = useProgress()

    const removeBeforeEach = router.beforeEach(() => start())
    const removeAfterEach = router.afterEach(() => stop())
    const removeOnError = router.onError(() => stop())

    onBeforeUnmount(() => {
      removeBeforeEach()
      removeAfterEach()
      removeOnError()
    })
  },
  render: () => null,
})
```


### `apps/web/src/bprogress.css`
```css
:root {
  --bprogress-color: var(--foreground);
  --bprogress-height: 2px;
  --bprogress-spinner-size: 18px;
  --bprogress-spinner-animation-duration: 400ms;
  --bprogress-spinner-border-size: 2px;
  --bprogress-box-shadow: 0 0 10px var(--bprogress-color), 0 0 5px var(--bprogress-color);
  --bprogress-z-index: 99999;
  --bprogress-spinner-top: 15px;
  --bprogress-spinner-bottom: auto;
  --bprogress-spinner-right: 15px;
  --bprogress-spinner-left: auto;
}

.bprogress {
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: var(--bprogress-z-index);
}

.bprogress .bar {
  background: var(--bprogress-color);
  position: fixed;
  z-index: var(--bprogress-z-index);
  top: 0;
  left: 0;
  width: 100%;
  height: var(--bprogress-height);
}

/* Fancy blur effect */
.bprogress .peg {
  display: block;
  position: absolute;
  right: 0;
  width: 100px;
  height: 100%;
  box-shadow: var(--bprogress-box-shadow);
  opacity: 1.0;
  transform: rotate(3deg) translate(0px, -4px);
}

/* Remove these to get rid of the spinner */
.bprogress .spinner {
  display: block;
  position: fixed;
  z-index: var(--bprogress-z-index);
  top: var(--bprogress-spinner-top);
  bottom: var(--bprogress-spinner-bottom);
  right: var(--bprogress-spinner-right);
  left: var(--bprogress-spinner-left);
}

.bprogress .spinner-icon {
  width: var(--bprogress-spinner-size);
  height: var(--bprogress-spinner-size);
  box-sizing: border-box;
  border: solid var(--bprogress-spinner-border-size) transparent;
  border-top-color: var(--bprogress-color);
  border-left-color: var(--bprogress-color);
  border-radius: 50%;
  -webkit-animation: bprogress-spinner var(--bprogress-spinner-animation-duration) linear infinite;
  animation: bprogress-spinner var(--bprogress-spinner-animation-duration) linear infinite;
}

/* Custom parent styles */
.bprogress-custom-parent {
  overflow: hidden;
  position: relative;
}

.bprogress-custom-parent .bprogress .spinner,
.bprogress-custom-parent .bprogress .bar {
  position: absolute;
}

/* Styles for indeterminate progress mode */
.bprogress .indeterminate {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--bprogress-height);
  overflow: hidden;
}

.bprogress .indeterminate .inc,
.bprogress .indeterminate .dec {
  position: absolute;
  top: 0;
  height: 100%;
  background-color: var(--bprogress-color);
}

.bprogress .indeterminate .inc {
  animation: bprogress-indeterminate-increase 2s infinite;
}

.bprogress .indeterminate .dec {
  animation: bprogress-indeterminate-decrease 2s 0.5s infinite;
}

@-webkit-keyframes bprogress-spinner {
  0%   { -webkit-transform: rotate(0deg); transform: rotate(0deg); }
  100% { -webkit-transform: rotate(360deg); transform: rotate(360deg); }
}

@keyframes bprogress-spinner {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes bprogress-indeterminate-increase {
  from { left: -5%; width: 5%; }
  to { left: 130%; width: 100%; }
}

@keyframes bprogress-indeterminate-decrease {
  from { left: -80%; width: 80%; }
  to { left: 110%; width: 10%; }
}
```
