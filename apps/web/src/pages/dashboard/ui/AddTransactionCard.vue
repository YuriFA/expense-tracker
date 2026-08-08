<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { AddTransactionTabs } from '@/features/transaction/add'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-muted-foreground">{{ t('addTransaction.newTransaction') }}</CardTitle>
    </CardHeader>

    <CardContent>
      <AddTransactionTabs />
    </CardContent>
  </Card>
</template>
