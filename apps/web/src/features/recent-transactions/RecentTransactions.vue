<script setup lang="ts">
import { useTransactionsStore } from '@/stores/use-transactions-store'
import TransactionListItem from './components/TransactionListItem.vue'
import { computed } from 'vue'

const transactions = useTransactionsStore()
const recentTransactions = computed(() => {
  return transactions.getTransactions({ limit: 10 })
})
</script>

<template>
  <ul class="space-y-2">
    <TransactionListItem v-for="item in recentTransactions" :key="item.id" :transaction="item" />
  </ul>
</template>
