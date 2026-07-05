<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { AddTransactionForm } from '@/features/add-transaction'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { AddTransferForm } from '@/features/add-transfer'
import { getTransactionsOptions } from '@/entities/transaction'
import TransactionsBrowser from './TransactionsBrowser.vue'
import { useLastCreatedTransaction } from '@/features/add-transaction'
import { Spinner } from '@/shared/ui/spinner'

const { t } = useI18n()
const transactionTypes = getTransactionsOptions()
const dialogOpen = ref(false)
const { lastCreatedCashflowTransaction, lastCreatedTransferTransaction, isReady } =
  useLastCreatedTransaction()

const handleSuccess = () => {
  dialogOpen.value = false
}
</script>

<template>
  <section>
    <div class="flex gap-4 justify-between items-center">
      <h1 class="text-2xl font-semibold">{{ t('pages.transactions') }}</h1>

      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button>{{ t('actions.create') }}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('addTransaction.newTransaction') }}</DialogTitle>
          </DialogHeader>
          <Tabs v-if="isReady" default-value="expense">
            <TabsList class="w-full">
              <TabsTrigger v-for="item in transactionTypes" :key="item.value" :value="item.value">
                {{ item.label }}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="expense">
              <AddTransactionForm
                type="expense"
                :last-created-transaction="lastCreatedCashflowTransaction"
                @success="handleSuccess"
              />
            </TabsContent>
            <TabsContent value="income">
              <AddTransactionForm
                type="income"
                :last-created-transaction="lastCreatedCashflowTransaction"
                @success="handleSuccess"
              />
            </TabsContent>
            <TabsContent value="transfer">
              <AddTransferForm
                :last-created-transaction="lastCreatedTransferTransaction"
                @success="handleSuccess"
              />
            </TabsContent>
          </Tabs>
          <Spinner v-else class="mx-auto my-6" />
        </DialogContent>
      </Dialog>
    </div>

    <TransactionsBrowser class="mt-6" />
  </section>
</template>
