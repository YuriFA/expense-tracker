<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/shared/ui/card'
import RecentTransactions from './RecentTransactions.vue'

const { t } = useI18n()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('recentTransactions.title') }}</CardTitle>
      <CardAction>
        <RouterLink
          class="text-xs font-semibold text-primary hover:underline"
          :to="{ path: '/transactions' }"
          data-testid="recent-transactions-all"
        >
          {{ t('recentTransactions.viewAll') }}
        </RouterLink>
      </CardAction>
    </CardHeader>
    <CardContent>
      <RecentTransactions />
    </CardContent>
  </Card>
</template>
