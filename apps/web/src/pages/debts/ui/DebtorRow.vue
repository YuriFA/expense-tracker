<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from '@lucide/vue'
import type { Debtor } from '@expense-tracker/api'
import { debtorAvatarColor, initialsOf } from '../model/selectors'
import { formatMoney, type CurrencyCode } from '@/shared/lib/money'
import { useSettingsStore } from '@/shared/store/use-settings-store'

const props = defineProps<{
  debtor: Debtor
  balance: number
}>()

const { locale } = useI18n()
const settings = useSettingsStore()
const displayCurrency = computed(() => settings.currency as CurrencyCode)

const balanceText = computed(() =>
  formatMoney(props.balance, displayCurrency.value, locale.value),
)
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent/50"
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
    <span class="text-sm" :class="{ 'text-destructive': balance < 0 }">{{ balanceText }}</span>
    <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  </button>
</template>
