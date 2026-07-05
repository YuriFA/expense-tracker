<script setup lang="ts">
import TransactionsActiveFilters from './TransactionsActiveFilters.vue'
import TransactionsDateFilter from './TransactionsDateFilter.vue'
import TransactionsFiltersSheet from './TransactionsFiltersSheet.vue'
import TransactionsItemsList from './TransactionsItemsList.vue'
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
