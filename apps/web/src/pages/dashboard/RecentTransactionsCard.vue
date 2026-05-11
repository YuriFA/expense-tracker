<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RecentTransactions from '@/features/transactions-list/RecentTransactions.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-muted-foreground">{{ t('recentTransactions.title') }}</CardTitle>
    </CardHeader>
    <CardContent>
      <RecentTransactions />
    </CardContent>
  </Card>
</template>
