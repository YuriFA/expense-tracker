<script setup lang="ts">
import TransactionsActiveFilters from './components/TransactionsActiveFilters.vue'
import TransactionsDateFilter from './components/TransactionsDateFilter.vue'
import TransactionsFiltersSheet from './components/TransactionsFiltersSheet.vue'
import TransactionsItemsList from './components/TransactionsItemsList.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-4 justify-between">
      <TransactionsDateFilter />
      <TransactionsFiltersSheet />
    </div>

    <TransactionsActiveFilters />

    <TransactionsItemsList />
  </div>
</template>
