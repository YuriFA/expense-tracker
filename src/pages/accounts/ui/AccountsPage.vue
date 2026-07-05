<script setup lang="ts">
import { useAccounts } from '@/entities/account'
import { useI18n } from 'vue-i18n'
import AccountCard from './AccountCard.vue'
import { Card, CardContent } from '@/shared/ui/card'
import { formatMoney, type CurrencyCode } from '@/shared/lib/money'
import { computed } from 'vue'
import { AddAccountDialog } from '../features/add-account'

const { t, locale } = useI18n()
const { data } = useAccounts()

const totalsByCurrency = computed(() => {
  const totals = new Map<CurrencyCode, number>()
  for (const account of data.value ?? []) {
    const current = totals.get(account.currency) ?? 0
    totals.set(account.currency, current + (account.balance ?? 0))
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }))
})

const format = (value: number, currency: CurrencyCode) =>
  formatMoney(value, currency, locale.value)
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex-1">
        <h1 class="text-2xl font-semibold">{{ t('pages.accounts') }}</h1>
        <p class="text-muted-foreground text-sm">{{ t('accounts.description') }}</p>
      </div>

      <AddAccountDialog />
    </div>

    <Card class="mt-4 bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
      <CardContent>
        <p class="text-sm">{{ t('accounts.totalBalance') }}</p>
        <div v-if="totalsByCurrency.length === 0" class="text-2xl font-semibold">
          {{ format(0, 'USD') }}
        </div>
        <div v-else class="flex flex-col gap-1">
          <p
            v-for="total in totalsByCurrency"
            :key="total.currency"
            class="text-2xl font-semibold"
          >
            {{ format(total.amount, total.currency) }}
          </p>
        </div>
      </CardContent>
    </Card>

    <ul class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 flex-wrap">
      <li v-for="account in data" :key="account.id">
        <AccountCard :account />
      </li>
    </ul>
  </section>
</template>
