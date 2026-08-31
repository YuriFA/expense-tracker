<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent } from '@/shared/ui/card'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'
import type { DirectionBalances } from '@/entities/debt-operation'

// Direction totals (debts capability): each is the sum of that direction's
// per-debtor balances, no netting across directions. Two eyebrow columns on
// one card with a hairline divider; receivable is signed «+», payable «−».

const props = defineProps<{
  totals: DirectionBalances
}>()

const { t, locale } = useI18n()
// Debts carry no currency of their own; the app display currency is fixed
// (currency-rub-only).
const displayCurrency = computed(() => DEFAULT_CURRENCY)

const format = (value: number) => formatMoney(value, displayCurrency.value, locale.value)

// Literal sign strings per branch (the i18n lint bans raw text in templates).
const receivableSign = '+'
const payableSign = '−'
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-4 sm:flex-row sm:gap-12">
      <div class="flex-1">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {{ t('debts.receivable') }}
        </p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-success">
          <span aria-hidden="true">{{ receivableSign }}</span
          ><span data-testid="debts-total-receivable">{{ format(props.totals.receivable) }}</span>
        </p>
      </div>
      <div class="hidden w-px bg-border sm:block" aria-hidden="true" />
      <div class="flex-1">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {{ t('debts.payable') }}
        </p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-warning">
          <span aria-hidden="true">{{ payableSign }}</span
          ><span data-testid="debts-total-payable">{{ format(props.totals.payable) }}</span>
        </p>
      </div>
    </CardContent>
  </Card>
</template>
