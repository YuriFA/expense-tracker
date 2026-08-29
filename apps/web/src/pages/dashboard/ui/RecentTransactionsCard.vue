<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DashboardCard from './DashboardCard.vue'
import RecentTransactions from './RecentTransactions.vue'

const { t } = useI18n()

defineProps<{
  /** Inclusive UTC-day superset of the selected dashboard month. */
  range: { fromDate: string; toDate: string }
}>()
</script>

<template>
  <DashboardCard :title="t('recentTransactions.title')" content-class="px-0!">
    <template #action>
      <RouterLink
        class="text-xs font-semibold text-primary hover:underline"
        :to="{ path: '/transactions' }"
        data-testid="recent-transactions-all"
      >
        {{ t('recentTransactions.viewAll') }}
      </RouterLink>
    </template>
    <RecentTransactions :range="range" />
  </DashboardCard>
</template>
