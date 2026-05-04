<script setup lang="ts">
import { useTransactionsStore } from '@/stores/use-transactions-store'
import TransactionListItem from './components/TransactionListItem.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const transactions = useTransactionsStore()
const { t } = useI18n()
const recentTransactions = computed(() => {
  return transactions.getTransactions({ limit: 10 })
})
</script>

<template>
  <section>
    <h2 class="text-muted-foreground font-medium text-sm">{{ t('recentTransactions.title') }}</h2>
    <ul class="space-y-2 mt-2">
      <TransactionListItem v-for="item in recentTransactions" :key="item.id" :transaction="item" />
    </ul>
  </section>
</template>
