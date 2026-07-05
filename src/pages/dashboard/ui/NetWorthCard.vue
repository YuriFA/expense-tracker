<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { formatMoney, type CurrencyCode } from '@/shared/lib/money'
import { useAccounts } from '@/entities/account'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t, locale } = useI18n()
const { data: accounts } = useAccounts()

const totalsByCurrency = computed(() => {
  const totals = new Map<CurrencyCode, number>()
  for (const account of accounts.value ?? []) {
    const current = totals.get(account.currency) ?? 0
    totals.set(account.currency, current + (account.balance ?? 0))
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }))
})

const format = (value: number, currency: CurrencyCode) =>
  formatMoney(value, currency, locale.value)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-muted-foreground">{{ t('dashboard.netWorth') }}</CardTitle>
      <div v-if="totalsByCurrency.length === 0" class="text-2xl font-bold">
        {{ format(0, 'USD') }}
      </div>
      <div v-else class="flex flex-col gap-1">
        <p
          v-for="total in totalsByCurrency"
          :key="total.currency"
          class="text-2xl font-bold"
        >
          {{ format(total.amount, total.currency) }}
        </p>
      </div>
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
          :to="{ path: '/transactions', query: { accountId: account.id } }"
          >{{ account.name }}</RouterLink
        >
        <p class="text-md">
          {{ format(account.balance, account.currency) }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>
