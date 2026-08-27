<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown, ArrowUp, Plus } from '@lucide/vue'
import type { PlannedPayment } from '@expense-tracker/api'
import { monthlyTotal } from '@/entities/planned-payment'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { DEFAULT_CURRENCY, formatMoney } from '@/shared/lib/money'

// One plan type's summary card: the plan count and the normalized monthly
// figure (monthlyAmount from the package - the only recurrence math).

const props = defineProps<{
  type: 'expense' | 'income'
  plans: readonly PlannedPayment[]
}>()

const emit = defineEmits<{
  openList: [type: 'expense' | 'income']
}>()

const { t, locale } = useI18n()
// Plans carry no currency of their own; the app display currency is fixed
// (currency-rub-only).
const displayCurrency = computed(() => DEFAULT_CURRENCY)

const cardTitle = computed(() =>
  props.type === 'expense' ? t('plans.expensesTitle') : t('plans.incomeTitle'),
)
const description = computed(() =>
  props.type === 'expense' ? t('plans.expensesDescription') : t('plans.incomeDescription'),
)
const monthlyText = computed(() =>
  `${formatMoney(monthlyTotal(props.plans), displayCurrency.value, locale.value)}${t('plans.perMonth')}`,
)
</script>

<template>
  <Card>
    <button
      type="button"
      class="w-full text-left"
      :data-testid="`plans-card-${type}`"
      @click="emit('openList', type)"
    >
      <CardHeader class="flex-row items-center justify-between">
        <div class="flex items-center gap-2">
          <span
            class="flex size-8 items-center justify-center rounded-full bg-[var(--primary)]/15"
            aria-hidden="true"
          >
            <ArrowUp v-if="type === 'expense'" class="size-4" />
            <ArrowDown v-else class="size-4" />
          </span>
          <div>
            <CardTitle class="text-base">{{ cardTitle }}</CardTitle>
            <p class="text-xs text-muted-foreground">{{ description }}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="size-7 rounded-full"
          :aria-label="type === 'expense' ? t('plans.addExpense') : t('plans.addIncome')"
          :data-testid="`plans-card-add-${type}`"
          @click.stop="emit('openList', type)"
        >
          <Plus class="size-4" />
        </Button>
      </CardHeader>
      <CardContent class="flex items-baseline justify-between pb-6">
        <span class="text-sm text-muted-foreground">
          {{ t('plans.planCount', props.plans.length) }}
        </span>
        <span class="text-lg font-semibold" :data-testid="`plans-total-${type}`">{{ monthlyText }}</span>
      </CardContent>
    </button>
  </Card>
</template>