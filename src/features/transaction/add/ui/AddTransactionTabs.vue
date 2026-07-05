<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { getTransactionsOptions } from '@/entities/transaction'
import { Spinner } from '@/shared/ui/spinner'
import { useLastCreatedTransaction } from '../model/use-transaction-form-data'
import CashflowForm from './CashflowForm.vue'
import TransferForm from './TransferForm.vue'

defineEmits<{
  success: []
}>()

const { t } = useI18n()
const transactionTypes = getTransactionsOptions()
const { lastCreatedCashflowTransaction, lastCreatedTransferTransaction, isReady } =
  useLastCreatedTransaction()
</script>

<template>
  <Tabs v-if="isReady" default-value="expense">
    <TabsList class="w-full">
      <TabsTrigger v-for="item in transactionTypes" :key="item.value" :value="item.value">
        {{ item.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent value="expense">
      <CashflowForm
        type="expense"
        :last-created-transaction="lastCreatedCashflowTransaction"
        @success="$emit('success')"
      />
    </TabsContent>
    <TabsContent value="income">
      <CashflowForm
        type="income"
        :last-created-transaction="lastCreatedCashflowTransaction"
        @success="$emit('success')"
      />
    </TabsContent>
    <TabsContent value="transfer">
      <TransferForm
        :last-created-transaction="lastCreatedTransferTransaction"
        @success="$emit('success')"
      />
    </TabsContent>
  </Tabs>
  <Spinner v-else class="mx-auto my-6" />
</template>
