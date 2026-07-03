<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { getTransactionsOptions } from '@/entities/transaction/constants'
import AddTransactionForm from '@/features/add-transaction/AddTransactionForm.vue'
import { useLastCreatedTransaction } from '@/features/add-transaction/composables/use-transaction-form-data'
import AddTransferForm from '@/features/add-transfer/AddTransferForm.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const transactionTypes = getTransactionsOptions()
const { lastCreatedCashflowTransaction, lastCreatedTransferTransaction, isReady } =
  useLastCreatedTransaction()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-muted-foreground">{{ t('addTransaction.newTransaction') }}</CardTitle>
    </CardHeader>

    <CardContent>
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
          />
        </TabsContent>
        <TabsContent value="income">
          <AddTransactionForm
            type="income"
            :last-created-transaction="lastCreatedCashflowTransaction"
          />
        </TabsContent>
        <TabsContent value="transfer">
          <AddTransferForm :last-created-transaction="lastCreatedTransferTransaction" />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>
