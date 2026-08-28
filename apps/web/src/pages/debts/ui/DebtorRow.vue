<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from '@lucide/vue'
import type { Debtor } from '@expense-tracker/api'
import type { DebtDirection } from '@/entities/debt-operation'
import { debtorAvatarColor, initialsOf } from '../model/selectors'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'

const props = defineProps<{
  debtor: Debtor
  balance: number
  /** The section's direction: it colors the balance (green/terracotta). */
  direction: DebtDirection
}>()

const { locale } = useI18n()
// Debts carry no currency of their own; the app display currency is fixed
// (currency-rub-only).
const displayCurrency = computed(() => DEFAULT_CURRENCY)

const balanceText = computed(() =>
  formatMoney(props.balance, displayCurrency.value, locale.value),
)

const balanceClass = computed(() => {
  if (props.balance < 0) return 'text-destructive'
  return props.direction === 'receivable' ? 'text-success' : 'text-warning'
})
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/70"
    :data-testid="`debts-debtor-${debtor.id}`"
    :aria-label="`${debtor.name}, ${balanceText}`"
  >
    <span
      class="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      :style="{ backgroundColor: debtorAvatarColor(debtor.id) }"
      aria-hidden="true"
    >
      {{ initialsOf(debtor.name) }}
    </span>
    <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ debtor.name }}</span>
    <span class="text-sm" :class="balanceClass">{{ balanceText }}</span>
    <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  </button>
</template>
