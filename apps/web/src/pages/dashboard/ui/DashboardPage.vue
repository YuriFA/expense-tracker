<script setup lang="ts">
import AddTransactionCard from './AddTransactionCard.vue'
import NetWorthCard from './NetWorthCard.vue'
import RecentTransactionsCard from './RecentTransactionsCard.vue'
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <NetWorthCard />
    <AddTransactionCard />
    <RecentTransactionsCard class="md:col-span-2" />
  </div>
</template>
