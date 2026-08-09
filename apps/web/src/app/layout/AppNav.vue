<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { computed } from 'vue'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/entities/session'
import { notification } from '@/shared/services/notification'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const navItems = computed(() => [
  { to: '/', label: t('nav.dashboard') },
  { to: '/transactions', label: t('nav.transactions') },
  { to: '/accounts', label: t('nav.accounts') },
  { to: '/settings', label: t('nav.settings') },
])

async function signOut() {
  await auth.logout()
  notification.success(t('auth.signedOut'))
  await router.push({ name: 'login' })
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
        <span class="text-sm text-muted-foreground">
          {{ t('auth.signedInAs') }} {{ auth.user?.email }}
        </span>
        <Button variant="ghost" @click="signOut">{{ t('auth.signOut') }}</Button>
      </div>
    </div>
  </nav>
</template>
