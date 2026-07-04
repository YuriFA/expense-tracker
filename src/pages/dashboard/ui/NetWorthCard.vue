<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { formatCurrency } from '@/shared/lib/money/format'
import { useAccounts } from '@/entities/account'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { serializeTransactionsQuery } from '@/features/transactions-list'
import { useSettingsStore } from '@/shared/store/use-settings-store'

const { t, locale } = useI18n()
const settings = useSettingsStore()
const format = (value: number) => formatCurrency(value, settings.currency, locale.value)
const { data: accounts } = useAccounts()

const totalBalanceFormatted = computed(() => {
  const totalBalance =
    accounts.value?.reduce((acc, account) => {
      return acc + (account.balance ?? 0)
    }, 0) ?? 0
  return format(totalBalance)
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-muted-foreground">{{ t('dashboard.netWorth') }}</CardTitle>
      <p class="text-2xl font-bold">{{ totalBalanceFormatted }}</p>
    </CardHeader>
    <CardContent class="mt-2">
      <div
        v-for="account in accounts"
        :key="account.id"
        :for="`account-${account.id}`"
        class="flex items-center gap-2 justify-between border-b-2 border-b-muted last:border-0 py-2"
      >
        <RouterLink
          class="text-sm text-muted-foreground hover:underline"
          :to="{
            path: '/transactions',
            query: serializeTransactionsQuery({
              accountId: account.id,
            }),
          }"
          >{{ account.name }}</RouterLink
        >
        <p class="text-md">
          {{ format(account.balance) }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>
