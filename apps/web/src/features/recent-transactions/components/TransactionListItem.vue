<script setup lang="ts">
import { useCurrencyFormatter } from '@/composables/use-currency-formatter'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { useCategoriesStore } from '@/stores/use-categories-store'
import { useSettingsStore } from '@/stores/use-settings-store'
import type { Transaction } from '@/types/transaction'
import { useDateFormat } from '@vueuse/core'

const { transaction } = defineProps<{ transaction: Transaction }>()
const { format } = useCurrencyFormatter()
const { locale } = useSettingsStore()
const categories = useCategoriesStore()
const accounts = useAccountsStore()
const formattedOccuredAt = useDateFormat(transaction.occurredAt, 'DD MMM YYYY HH:mm:ss', {
  locales: locale,
})

const category = transaction.categoryId ? categories.findById(transaction.categoryId) : undefined
const account = 'accountId' in transaction ? accounts.findById(transaction.accountId) : undefined
</script>

<template>
  <li class="flex items-center gap-3 px-3 py-2 border rounded-md">
    <div class="flex-1">
      <p v-if="transaction.description" class="text-sm font-medium">
        {{ transaction.description }}
      </p>
      <p class="text-xs text-muted-foreground">
        <span v-if="category">
          {{ category.icon }}
          {{ category.name }}
        </span>
        · <span v-if="account">{{ account.name }}</span> · <span>{{ formattedOccuredAt }}</span>
      </p>
    </div>
    <p
      class="text-sm font-medium"
      :class="{
        'text-green-500': transaction.type === 'income',
        'text-red-500': transaction.type === 'expense',
      }"
    >
      <span v-if="transaction.type === 'income'">+</span>
      <span v-if="transaction.type === 'expense'">-</span>
      <span>{{ format(transaction.amount) }}</span>
    </p>
  </li>
</template>
