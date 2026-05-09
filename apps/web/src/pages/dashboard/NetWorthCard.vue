<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccountBalances } from '@/composables/use-account-balances'
import { useCurrencyFormatter } from '@/composables/use-currency-formatter'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const accounts = useAccountsStore()
const { getAccountBalance } = useAccountBalances()
const { format } = useCurrencyFormatter()
const { totalBalance } = useAccountBalances()
const { t } = useI18n()

const totalBalanceFormatted = computed(() => {
  return format(totalBalance.value)
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
        v-for="account in accounts.items"
        :key="account.id"
        :for="`account-${account.id}`"
        class="flex items-center gap-2 justify-between border-b-2 border-b-muted last:border-0 py-2"
      >
        <p class="text-sm text-muted-foreground">{{ account.name }}</p>
        <p class="text-md">
          {{ format(getAccountBalance(account.id) ?? 0) }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>
