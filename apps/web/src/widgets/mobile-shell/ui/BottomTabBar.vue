<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { CalendarClock, ChartPie, House, Settings } from '@lucide/vue'
import { isRouteActive } from '@/shared/lib/route-active'

// Primary tabs only (web-screens: mobile navigation shell). Transactions,
// debts, and accounts stay reachable from the dashboard cards, so the bar
// keeps the RN app's 2 + gap + 2 layout around the central FAB slot.
const { t } = useI18n()
const route = useRoute()

const leftGroup = computed(() => [
  { to: '/', name: 'home', label: t('nav.dashboard'), icon: House },
  { to: '/plans', name: 'plans', label: t('nav.plans'), icon: CalendarClock },
])
const rightGroup = computed(() => [
  { to: '/analytics', name: 'analytics', label: t('nav.analytics'), icon: ChartPie },
  { to: '/settings', name: 'settings', label: t('nav.settings'), icon: Settings },
])
</script>

<template>
  <nav
    class="pointer-events-auto relative z-40 mx-4 flex h-16 self-stretch items-center rounded-3xl border border-border bg-card px-2 shadow-[0_0_24px_-8px_rgba(0,0,0,0.25)] max-[379px]:mx-3 max-[379px]:px-1.5"
    :aria-label="t('shell.mainNav')"
  >
    <div class="flex flex-1 items-center justify-evenly">
      <RouterLink
        v-for="item in leftGroup"
        :key="item.name"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] py-2 whitespace-nowrap text-[10px] font-medium max-[379px]:text-[9px] transition-colors"
        :class="
          isRouteActive(route.name, item.name)
            ? 'bg-secondary text-primary'
            : 'text-muted-foreground'
        "
        :data-testid="`tab-${item.name}`"
      >
        <component :is="item.icon" class="size-[22px]" aria-hidden="true" />
        {{ item.label }}
      </RouterLink>
    </div>

    <!-- Central gap slot for the FAB straddling the bar's top edge. -->
    <div class="w-14 shrink-0 max-[379px]:w-12" aria-hidden="true" />

    <div class="flex flex-1 items-center justify-evenly">
      <RouterLink
        v-for="item in rightGroup"
        :key="item.name"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] py-2 whitespace-nowrap text-[10px] font-medium max-[379px]:text-[9px] transition-colors"
        :class="
          isRouteActive(route.name, item.name)
            ? 'bg-secondary text-primary'
            : 'text-muted-foreground'
        "
        :data-testid="`tab-${item.name}`"
      >
        <component :is="item.icon" class="size-[22px]" aria-hidden="true" />
        {{ item.label }}
      </RouterLink>
    </div>
  </nav>
</template>
