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
