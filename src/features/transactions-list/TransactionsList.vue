<script setup lang="ts">
import TransactionListItem from '@/features/transactions-list/components/TransactionListItem.vue'
import { useTransactionsStore } from '@/stores/use-transactions-store'
import { computed } from 'vue'
import { useTransactionsFilters } from './composables/use-transactions-filters'

const transactions = useTransactionsStore()
const { fromDate, toDate } = useTransactionsFilters()

const filteredTransactions = computed(() => {
  return transactions.getTransactions({
    fromDate: fromDate.value,
    toDate: toDate.value,
  })
})
</script>

<template>
  <ul class="space-y-2">
    <TransactionListItem v-for="item in filteredTransactions" :key="item.id" :transaction="item" />
  </ul>
</template>
