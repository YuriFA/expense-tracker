<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import TransactionsList from '@/features/transactions-list/TransactionsList.vue'
import { useI18n } from 'vue-i18n'
import TransactionsDateFilter from '@/features/transactions-list/components/TransactionsDateFilter.vue'
import TransactionsFiltersSheet from '@/features/transactions-list/components/TransactionsFiltersSheet.vue'
import TransactionsActiveFilters from '@/features/transactions-list/components/TransactionsActiveFilters.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import AddTransactionForm from '@/features/add-transaction/AddTransactionForm.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddTransferForm from '@/features/add-transfer/AddTransferForm.vue'
import { getTransactionsOptions } from '@/entities/transaction/constants'

const { t } = useI18n()
const transactionTypes = getTransactionsOptions()
const dialogOpen = ref(false)

const onSuccess = () => {
  toast.success(t('addTransaction.success'))
  dialogOpen.value = false
}
</script>

<template>
  <section>
    <div class="flex gap-4 justify-between items-center">
      <h1 class="text-2xl font-semibold">{{ t('pages.transactions') }}</h1>

      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button>{{ t('actions.new') }}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('dashboard.newTransaction') }}</DialogTitle>
          </DialogHeader>
          <Tabs default-value="expense">
            <TabsList class="w-full">
              <TabsTrigger v-for="item in transactionTypes" :key="item.value" :value="item.value">
                {{ item.label }}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="expense">
              <AddTransactionForm type="expense" @success="onSuccess" />
            </TabsContent>
            <TabsContent value="income">
              <AddTransactionForm type="income" @success="onSuccess" />
            </TabsContent>
            <TabsContent value="transfer">
              <AddTransferForm @success="onSuccess" />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>

    <div class="space-y-4 mt-6">
      <div class="flex items-center gap-4 justify-between">
        <TransactionsDateFilter />
        <TransactionsFiltersSheet />
      </div>

      <TransactionsActiveFilters />

      <TransactionsList />
    </div>
  </section>
</template>
