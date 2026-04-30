<template>
  <nav class="border-b backdrop-blur">
    <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
      <Button v-for="item in navItems" :key="item.to" asChild variant="ghost">
        <RouterLink
          :to="item.to"
          class="transition hover:bg-accent"
          active-class="bg-accent hover:bg-accent/70"
        >
          {{ t(item.label) }}
        </RouterLink>
      </Button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'

const { t } = useI18n()

const navItems = [
  { to: '/', label: 'nav.dashboard' },
  { to: '/transactions', label: 'nav.transactions' },
  { to: '/analytics', label: 'nav.analytics' },
  { to: '/settings', label: 'nav.settings' },
]
</script>
