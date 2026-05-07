<script setup lang="ts">
import { useAccountsStore } from '@/stores/use-accounts-store'
import { useI18n } from 'vue-i18n'
import AccountCard from './AccountCard.vue'
import { Card, CardContent } from '@/components/ui/card'
import { useAccountBalances } from '@/composables/use-account-balances'
import { useCurrencyFormatter } from '@/composables/use-currency-formatter'
import { computed } from 'vue'

const { t } = useI18n()
const accounts = useAccountsStore()
const { totalBalance } = useAccountBalances()
const { format } = useCurrencyFormatter()
const totalBalanceFormatted = computed(() => {
  return format(totalBalance.value)
})
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">{{ t('pages.accounts') }}</h1>
    <p class="text-muted-foreground text-sm">{{ t('accounts.description') }}</p>

    <Card
      class="mt-4 bg-linear-to-br from-primary to-primary/80 text-primary-foreground"
    >
      <CardContent>
        <p class="text-sm">{{ t('accounts.totalBalance') }}</p>
        <p class="text-2xl font-semibold">
          {{ totalBalanceFormatted }}
        </p>
      </CardContent>
    </Card>

    <ul class="mt-6 flex gap-4">
      <li v-for="account in accounts.items" :key="account.id" class="flex-1">
        <AccountCard :account />
      </li>
    </ul>
  </section>
</template>
