<template>
  <nav class="border-b border-slate-200 bg-white/80 backdrop-blur">
    <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
        active-class="bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
      >
        {{ t(item.label) }}
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const navItems = [
  { to: '/', label: 'nav.dashboard' },
  { to: '/transactions', label: 'nav.transactions' },
  { to: '/analytics', label: 'nav.analytics' },
  { to: '/settings', label: 'nav.settings' },
]
</script>
