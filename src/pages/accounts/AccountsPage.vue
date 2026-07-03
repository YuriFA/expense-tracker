<script setup lang="ts">
import { useAccounts } from '@/entities/account/use-accounts'
import { useI18n } from 'vue-i18n'
import AccountCard from './AccountCard.vue'
import { Card, CardContent } from '@/shared/ui/card'
import { formatCurrency } from '@/shared/lib/money/format'
import { computed } from 'vue'
import { useSettingsStore } from '@/shared/stores/use-settings-store'
import AddAccountDialog from '@/features/add-account/AddAccountDialog.vue'

const { t, locale } = useI18n()
const { data } = useAccounts()
const settings = useSettingsStore()
const format = (value: number) => formatCurrency(value, settings.currency, locale.value)
const totalBalanceFormatted = computed(() => {
  const totalBalance =
    data.value?.reduce((acc, account) => {
      return acc + (account.balance ?? 0)
    }, 0) ?? 0
  return format(totalBalance)
})
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
        <p class="text-2xl font-semibold">
          {{ totalBalanceFormatted }}
        </p>
      </CardContent>
    </Card>

    <ul class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 flex-wrap">
      <li v-for="account in data" :key="account.id">
        <AccountCard :account />
      </li>
    </ul>
  </section>
</template>
