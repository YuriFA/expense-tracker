<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'
import { RouterLink } from 'vue-router'
import { computed } from 'vue'

const { t } = useI18n()

const navItems = computed(() => [
  { to: '/', label: t('nav.dashboard') },
  { to: '/transactions', label: t('nav.transactions') },
  { to: '/accounts', label: t('nav.accounts') },
  { to: '/settings', label: t('nav.settings') },
])
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
          {{ t(item.label) }}
        </RouterLink>
      </Button>
    </div>
  </nav>
</template>
