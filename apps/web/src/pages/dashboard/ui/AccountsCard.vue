<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import DashboardCard from './DashboardCard.vue'
import { formatMoney, DEFAULT_CURRENCY, type CurrencyCode } from '@/shared/lib/money'
import { useAccounts } from '@/entities/account'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/ui/error-state'

const { t, locale } = useI18n()
const { data: accounts, error, isLoading, refetch } = useAccounts()

// Accounts aggregate is a plain minor-unit sum in the fixed app display
// currency (currency-rub-only).
const totalMinor = computed(() =>
  (accounts.value ?? []).reduce((sum, account) => sum + (account.balance ?? 0), 0),
)

const format = (value: number, currency: CurrencyCode = DEFAULT_CURRENCY) =>
  formatMoney(value, currency, locale.value)
</script>

<template>
  <DashboardCard :title="t('pages.accounts')" content-class="py-4">
    <template #action>
      <RouterLink
        class="text-xs font-semibold text-primary hover:underline"
        :to="{ path: '/accounts' }"
        data-testid="accounts-card-view-all"
      >
        {{ t('actions.viewAll') }}
      </RouterLink>
    </template>
    <ErrorState v-if="error" @retry="refetch" />
    <template v-else-if="isLoading">
      <div v-for="n in 3" :key="n" class="flex items-center justify-between gap-2 py-2">
        <Skeleton class="h-4 w-24" />
        <Skeleton class="h-4 w-20" />
      </div>
    </template>
    <template v-else-if="accounts && accounts.length > 0">
      <div
        v-for="account in accounts"
        :key="account.id"
        class="flex items-center justify-between gap-2 py-2"
      >
        <RouterLink
          class="text-sm text-muted-foreground hover:underline"
          :to="{ path: '/transactions', query: { accountId: account.id } }"
        >
          {{ account.name }}
        </RouterLink>
        <p class="text-sm font-medium tabular-nums">
          {{ format(account.balance, account.currency) }}
        </p>
      </div>
      <div class="mt-3 -mx-4 md:-mx-6 px-4 md:px-6 flex items-center justify-between gap-2 border-t border-border pt-3">
        <p class="text-xs font-bold uppercase tracking-wider">{{ t('dashboard.total') }}</p>
        <p class="text-lg font-bold tabular-nums">{{ format(totalMinor) }}</p>
      </div>
    </template>
    <p v-else class="py-6 text-sm text-muted-foreground">
      {{ t('accounts.noAccounts') }}
    </p>
  </DashboardCard>
</template>
