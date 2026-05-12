<script setup lang="ts">
import TransactionsList from '@/features/transactions-list/TransactionsList.vue'
import { useI18n } from 'vue-i18n'
import TransactionsDateFilter from '@/features/transactions-list/components/TransactionsDateFilter.vue'
import TransactionsFiltersSheet from '@/features/transactions-list/components/TransactionsFiltersSheet.vue'
import TransactionsActiveFilters from '@/features/transactions-list/components/TransactionsActiveFilters.vue'

const { t } = useI18n()
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">{{ t('pages.transactions') }}</h1>

    <div class="space-y-4 mt-4">
      <div class="flex items-center gap-4 justify-between">
        <TransactionsDateFilter />
        <TransactionsFiltersSheet />
      </div>

      <TransactionsActiveFilters />

      <TransactionsList />
    </div>
  </section>
</template>
