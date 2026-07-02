<script setup lang="ts">
import { useCurrencyFormatter } from '@/composables/use-currency-formatter'
import { isTransferTransaction } from '@/entities/transaction/transaction'
import { useAccounts } from '@/entities/account/use-accounts'
import { useCategories } from '@/entities/category/use-categories'
import type { Transaction } from '@/entities/transaction/types'
import { useDateFormat } from '@vueuse/core'
import { RepeatIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { transaction } = defineProps<{ transaction: Transaction }>()
const { format } = useCurrencyFormatter()
const { locale, t } = useI18n()
const { data: categories } = useCategories()
const { data: accounts } = useAccounts()

const category = computed(() => {
  return categories.value?.find((category) => category.id === transaction.categoryId)
})

const account = computed(() => {
  if (isTransferTransaction(transaction)) {
    return undefined
  }
  return accounts.value?.find((account) => account.id === transaction.accountId)
})
const fromAccount = computed(() => {
  if (isTransferTransaction(transaction)) {
    return accounts.value?.find((account) => account.id === transaction.fromAccountId)
  }
  return undefined
})
const toAccount = computed(() => {
  if (isTransferTransaction(transaction)) {
    return accounts.value?.find((account) => account.id === transaction.toAccountId)
  }
  return undefined
})

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
  </li>
</template>
