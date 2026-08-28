<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/shared/ui/card'
import { useDebtOperations, totalsByDirection } from '@/entities/debt-operation'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/ui/error-state'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'

// The two debt directions are independent (debts capability): the card lists
// each non-zero direction total instead of netting them into one figure.
const { t, locale } = useI18n()
const { data: operations, error, isLoading, refetch } = useDebtOperations()

const totals = computed(() => totalsByDirection(operations.value ?? []))

// Signs are formatting, not copy - composed in script so templates stay
// free of raw text (i18n lint).
const receivableText = computed(() => `+${format(totals.value.receivable)}`)
const payableText = computed(() => `−${format(totals.value.payable)}`)

const format = (value: number) => formatMoney(value, DEFAULT_CURRENCY, locale.value)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('pages.debts') }}</CardTitle>
      <CardAction>
        <RouterLink
          class="text-sm text-muted-foreground hover:underline"
          :to="{ path: '/debts' }"
        >
          {{ t('recentTransactions.viewAll') }}
        </RouterLink>
      </CardAction>
    </CardHeader>
    <CardContent>
      <ErrorState v-if="error" @retry="refetch" />
      <template v-else-if="isLoading">
        <div v-for="n in 2" :key="n" class="flex items-center justify-between gap-2 py-2">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-20" />
        </div>
      </template>
      <p v-else-if="totals.receivable === 0 && totals.payable === 0" class="py-6 text-sm text-muted-foreground">
        {{ t('dashboard.noDebts') }}
      </p>
      <div v-else>
        <div
          v-if="totals.receivable > 0"
          class="flex items-center justify-between gap-2 border-b-2 border-b-muted py-2"
          data-testid="debts-card-receivable"
        >
          <p class="text-sm text-muted-foreground">{{ t('dashboard.owedToMe') }}</p>
          <p class="text-sm font-semibold tabular-nums text-success">
            {{ receivableText }}
          </p>
        </div>
        <div
          v-if="totals.payable > 0"
          class="flex items-center justify-between gap-2 py-2"
          :class="totals.receivable > 0 ? 'border-b-2 border-b-muted' : ''"
          data-testid="debts-card-payable"
        >
          <p class="text-sm text-muted-foreground">{{ t('dashboard.owedByMe') }}</p>
          <p class="text-sm font-semibold tabular-nums text-warning">
            {{ payableText }}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
