<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import {
  ArrowLeftRight,
  CalendarClock,
  ChartPie,
  HandCoins,
  House,
  LogOut,
  Plus,
  Settings,
  Wallet,
} from '@lucide/vue'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { SyncStatusBadge } from '@/widgets/sync-status'
import { AddTransactionTabs } from '@/features/transaction/add'
import { useAuthStore } from '@/entities/session'
import { notification } from '@/shared/services/notification'

withDefaults(
  defineProps<{
    // The compact sheet variant drops the auth footer: the mobile top bar
    // carries the badges and sign-in entry, so only one instance of each
    // testid lives in the DOM per viewport.
    footer?: boolean
  }>(),
  { footer: true },
)

const emit = defineEmits<{ navigate: [] }>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const navItems = computed(() => [
  { to: '/', name: 'home', label: t('nav.dashboard'), icon: House },
  { to: '/transactions', name: 'transactions', label: t('nav.transactions'), icon: ArrowLeftRight },
  { to: '/analytics', name: 'analytics', label: t('nav.analytics'), icon: ChartPie },
  { to: '/debts', name: 'debts', label: t('nav.debts'), icon: HandCoins },
  { to: '/plans', name: 'plans', label: t('nav.plans'), icon: CalendarClock },
  { to: '/accounts', name: 'accounts', label: t('nav.accounts'), icon: Wallet },
  { to: '/settings', name: 'settings', label: t('nav.settings'), icon: Settings },
])

// Flat route records: analytics-detail keeps Аналитика active by name prefix.
const isActive = (name: string) => typeof route.name === 'string' && route.name.startsWith(name)

const addOpen = ref(false)

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
  <div class="flex h-full flex-col gap-5 p-5">
    <!-- The logo doubles as a home link (canvas): the nav item below stays
         the primary "where am I" anchor, this is a shortcut on top. -->
    <RouterLink :to="{ path: '/' }" class="flex items-center gap-2.5" data-testid="sidebar-logo">
      <span
        class="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <Wallet class="size-4.5" />
      </span>
      <span class="text-xl font-bold tracking-tight">{{ t('app.name') }}</span>
    </RouterLink>

    <nav class="flex flex-col gap-1 text-[15px]">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-md py-1.5 transition-colors"
        :class="
          isActive(item.name)
            ? 'font-semibold text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        data-testid="sidebar-nav-link"
        @click="emit('navigate')"
      >
        <component :is="item.icon" class="size-4.5" aria-hidden="true" />
        <span
          class="relative"
          :class="
            isActive(item.name)
              ? 'after:absolute after:-bottom-0.5 after:inset-x-0 after:h-0.5 after:bg-primary'
              : ''
          "
        >
          {{ item.label }}
        </span>
      </RouterLink>
    </nav>

    <Dialog v-model:open="addOpen">
      <DialogTrigger as-child>
        <Button size="lg" data-testid="sidebar-add-operation">
          <Plus class="size-4" aria-hidden="true" />
          {{ t('dashboard.addOperation') }}
        </Button>
      </DialogTrigger>
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('addTransaction.newTransaction') }}</DialogTitle>
        </DialogHeader>
        <AddTransactionTabs @success="addOpen = false" />
      </DialogContent>
    </Dialog>

    <div
      v-if="footer && auth.isAuthenticated"
      class="mt-auto flex flex-col gap-2.5 border-t border-sidebar-border pt-4"
    >
      <SyncStatusBadge class="w-fit" />
      <span class="truncate text-sm font-medium">{{ auth.user?.email }}</span>
      <Button
        variant="ghost"
        size="sm"
        class="w-fit gap-1.5 px-2 text-xs text-muted-foreground"
        @click="signOut"
      >
        <LogOut class="size-3.5" aria-hidden="true" />
        {{ t('auth.signOut') }}
      </Button>
    </div>

    <div
      v-else-if="footer"
      class="mt-auto flex flex-col gap-2.5 border-t border-sidebar-border pt-4"
    >
      <!-- Anonymous (local) mode indicator: everything works on local data;
           sign-in only adds server sync. -->
      <Badge variant="secondary" class="w-fit" data-testid="guest-mode-indicator">
        {{ t('auth.guestMode') }}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        class="w-fit px-2 text-xs text-muted-foreground"
        @click="goToLogin"
      >
        {{ t('auth.signIn') }}
      </Button>
    </div>
  </div>
</template>
