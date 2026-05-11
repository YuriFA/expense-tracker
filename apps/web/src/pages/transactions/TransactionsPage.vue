<script setup lang="ts">
import TransactionsList from '@/features/transactions-list/TransactionsList.vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { ListFilterIcon } from 'lucide-vue-next'
import TransactionsDateFilter from '@/features/transactions-list/components/TransactionsDateFilter.vue'

const { t } = useI18n()
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">{{ t('pages.transactions') }}</h1>

    <div class="space-y-4 mt-4">
      <div class="flex items-center gap-4 justify-between">
        <TransactionsDateFilter />

        <Button variant="outline"><ListFilterIcon /> {{ t('transactions.filter') }}</Button>
      </div>

      <TransactionsList />
    </div>
  </section>
</template>
