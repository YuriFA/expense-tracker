<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown, ArrowUp } from '@lucide/vue'
import { Card, CardContent } from '@/shared/ui/card'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'
import type { DirectionBalances } from '@/entities/debt-operation'

// Direction totals: each is the sum of that direction's per-debtor balances
// (no netting across directions - debts capability). The two directions get
// their own semantic tints (green receivable / terracotta payable).

defineProps<{
  totals: DirectionBalances
}>()

const { t, locale } = useI18n()
// Debts carry no currency of their own; the app display currency is fixed
// (currency-rub-only).
const displayCurrency = computed(() => DEFAULT_CURRENCY)

const format = (value: number) => formatMoney(value, displayCurrency.value, locale.value)
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-3 pb-6 sm:flex-row">
      <div class="flex flex-1 items-center gap-3">
        <span
          class="flex size-9 items-center justify-center rounded-full bg-success/10 text-success"
          aria-hidden="true"
        >
          <ArrowDown class="size-4" />
        </span>
        <span class="flex-1 text-sm font-medium">{{ t('debts.receivable') }}</span>
        <span class="font-semibold text-success" data-testid="debts-total-receivable">
          {{ format(totals.receivable) }}
        </span>
      </div>
      <div class="flex flex-1 items-center gap-3">
        <span
          class="flex size-9 items-center justify-center rounded-full bg-warning/10 text-warning"
          aria-hidden="true"
        >
          <ArrowUp class="size-4" />
        </span>
        <span class="flex-1 text-sm font-medium">{{ t('debts.payable') }}</span>
        <span class="font-semibold text-warning" data-testid="debts-total-payable">
          {{ format(totals.payable) }}
        </span>
      </div>
    </CardContent>
  </Card>
</template>
