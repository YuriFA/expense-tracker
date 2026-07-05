<script setup lang="ts">
import { formatMoney, DEFAULT_CURRENCY, type CurrencyCode } from '@/shared/lib/money'
import { isTransferTransaction } from '../model/transaction'
import type { Transaction } from '../model/types'
import { useDateFormat } from '@vueuse/core'
import { RepeatIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface AccountRef {
  id: string
  name: string
  currency?: CurrencyCode
}

interface CategoryRef {
  id: string
  name: string
  icon: string
}

const { transaction, accounts = [], categories = [] } = defineProps<{
  transaction: Transaction
  accounts?: AccountRef[]
  categories?: CategoryRef[]
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

const format = (value: number) =>
  formatMoney(value, transactionCurrency.value, locale.value)

const formattedOccuredAt = useDateFormat(transaction.occurredAt, 'DD MMM YYYY HH:mm', {
  locales: locale.value,
})

const isTransfer = computed(() => isTransferTransaction(transaction))
</script>

<template>
  <li class="flex items-center gap-3 px-3 py-2 border rounded-md">
    <div
      v-if="category"
      class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm"
    >
      {{ category.icon }}
    </div>
    <div
      v-if="isTransfer"
      class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm"
    >
      <RepeatIcon class="size-4" />
    </div>
    <div class="flex-1">
      <p v-if="transaction.description" class="text-sm font-medium">
        {{ transaction.description }}
      </p>
      <p class="text-xs text-muted-foreground">
        <template v-if="isTransfer">
          <span v-if="fromAccount && toAccount">
            {{ fromAccount.name }} -> {{ toAccount.name }}
          </span>
          <span v-else>{{ t('transactions.types.transfer') }}</span>
          · <span>{{ formattedOccuredAt }}</span>
        </template>
        <template v-else>
          <span v-if="category">
            {{ category.name }}
          </span>
          · <span v-if="account">{{ account.name }}</span> · <span>{{ formattedOccuredAt }}</span>
        </template>
      </p>
    </div>
    <p
      class="text-sm font-medium"
      :class="{
        'text-green-500': transaction.type === 'income',
        'text-red-500': transaction.type === 'expense',
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
