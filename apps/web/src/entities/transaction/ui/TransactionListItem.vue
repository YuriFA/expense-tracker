<script setup lang="ts">
import { formatMoney, DEFAULT_CURRENCY, type CurrencyCode } from '@/shared/lib/money'
import { isTransferTransaction } from '../model/transaction'
import type { Transaction } from '../model/types'
import { useDateFormat } from '@vueuse/core'
import { RepeatIcon } from '@lucide/vue'
import { computed, type HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { CategoryAvatar } from '@/shared/ui/category-avatar'
import { cn } from '@/shared/lib/utils'

interface AccountRef {
  id: string
  name: string
  currency?: CurrencyCode
}

interface CategoryRef {
  id: string
  name: string
  icon: string
  color?: string
}

const {
  transaction,
  accounts = [],
  categories = [],
  author = null,
  class: className = '',
} = defineProps<{
  class?: HTMLAttributes['class']
  transaction: Transaction
  accounts?: AccountRef[]
  categories?: CategoryRef[]
  /**
   * Compact authorship marker (household-ux 3.4): the author's member label;
   * null/undefined renders nothing (own/unknown author, single-member
   * household). Resolved by the page over the household members cache.
   */
  author?: string | null
}>()

const { locale, t } = useI18n()

const category = computed(() => {
  return categories?.find((category) => category.id === transaction.categoryId)
})

const account = computed(() => {
  if (isTransferTransaction(transaction)) {
    return undefined
  }
  return accounts?.find((account) => account.id === transaction.accountId)
})
const fromAccount = computed(() => {
  if (isTransferTransaction(transaction)) {
    return accounts?.find((account) => account.id === transaction.fromAccountId)
  }
  return undefined
})
const toAccount = computed(() => {
  if (isTransferTransaction(transaction)) {
    return accounts?.find((account) => account.id === transaction.toAccountId)
  }
  return undefined
})

const transactionCurrency = computed<CurrencyCode>(() => {
  if (isTransferTransaction(transaction)) {
    return fromAccount.value?.currency ?? DEFAULT_CURRENCY
  }
  return account.value?.currency ?? DEFAULT_CURRENCY
})

const format = (value: number) => formatMoney(value, transactionCurrency.value, locale.value)

// Short recent-row date: day + month + time, no year («26 авг, 22:41»).
const formattedOccuredAt = useDateFormat(transaction.occurredAt, 'DD MMM, HH:mm', {
  locales: locale.value,
})

const isTransfer = computed(() => isTransferTransaction(transaction))

// Draft meta uses a bullet separator and an arrow for transfers; kept as
// script constants (i18n lint bans raw non-text glyphs in templates).
const SEPARATOR = '•'
const ARROW = '→'
</script>

<template>
  <!-- Flat divider-separated row (warm-minimal system): the list wrapper
       owns the dividers, the row stays unboxed. -->
  <li :class="cn('flex items-center gap-3 px-1 py-2.5', className)">
    <CategoryAvatar
      v-if="category"
      :icon="category.icon"
      :color="category.color"
      class="size-10 text-lg"
    />
    <div
      v-if="isTransfer"
      class="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
    >
      <RepeatIcon class="size-5" />
    </div>
    <div class="flex-1">
      <p v-if="transaction.description" class="text-sm font-medium">
        {{ transaction.description }}
      </p>
      <p class="text-xs text-muted-foreground">
        <template v-if="isTransfer">
          <span v-if="fromAccount && toAccount">
            {{ fromAccount.name }} {{ ARROW }} {{ toAccount.name }}
          </span>
          <span v-else>{{ t('transactions.types.transfer') }}</span>
          {{ SEPARATOR }} <span>{{ formattedOccuredAt }}</span>
        </template>
        <template v-else>
          <span v-if="category">
            {{ category.name }}
          </span>
          {{ SEPARATOR }} <span v-if="account">{{ account.name }}</span> {{ SEPARATOR }}
          <span>{{ formattedOccuredAt }}</span>
        </template>
        <template v-if="author">
          {{ SEPARATOR }}
          <span
            :data-testid="`transaction-row-author-${transaction.id}`"
            :title="t('household.authorMarkerTooltip', { name: author })"
            >{{ author }}</span
          >
        </template>
      </p>
    </div>
    <p
      class="min-w-24 text-right text-sm font-semibold tabular-nums"
      :class="{
        'text-success': transaction.type === 'income',
        'text-destructive': transaction.type === 'expense',
        'text-foreground': transaction.type === 'transfer',
      }"
    >
      <span v-if="transaction.type === 'income'">+</span>
      <span v-if="transaction.type === 'expense'">-</span>
      <span>{{ format(transaction.amount) }}</span>
    </p>
    <slot name="actions" :transaction="transaction" />
  </li>
</template>
