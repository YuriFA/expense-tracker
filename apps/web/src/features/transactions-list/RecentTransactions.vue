<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TransactionListItem from './components/TransactionListItem.vue'
import { useTransactions } from '@/entities/transaction'

const { t } = useI18n()
const { data, error, isLoading } = useTransactions({ limit: 5 })
</script>

<template>
  <ul class="space-y-2">
    <template v-if="isLoading">
      <li v-for="n in 5" :key="n" class="h-12 bg-gray-200 rounded animate-pulse"></li>
    </template>
    <template v-else-if="error">
      <li class="text-red-500">{{ t('transactions.errorLoadingTransactions', { error }) }}</li>
    </template>
    <template v-else-if="data && data.length === 0">
      <li class="text-gray-500">{{ t('transactions.noTransactions') }}</li>
    </template>
    <template v-else>
      <TransactionListItem v-for="item in data" :key="item.id" :transaction="item" />
    </template>
  </ul>
</template>
