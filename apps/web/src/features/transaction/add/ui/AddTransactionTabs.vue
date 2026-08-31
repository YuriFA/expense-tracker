<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { getTransactionsOptions } from '@/entities/transaction'
import type { AddTransactionType } from '../model/add-transaction-dialog'
import CashflowForm from './CashflowForm.vue'
import TransferForm from './TransferForm.vue'

// `preselect` opens the flow on a given tab (command palette / FAB parity);
// the host unmounts this tree on close, so default-value reapplies per open.
const { preselect = 'expense' } = defineProps<{
  preselect?: AddTransactionType
}>()

defineEmits<{
  success: []
}>()

const transactionTypes = getTransactionsOptions()
</script>

<template>
  <Tabs :default-value="preselect ?? 'expense'">
    <TabsList class="w-full">
      <TabsTrigger v-for="item in transactionTypes" :key="item.value" :value="item.value">
        {{ item.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent value="expense">
      <CashflowForm type="expense" @success="$emit('success')" />
    </TabsContent>
    <TabsContent value="income">
      <CashflowForm type="income" @success="$emit('success')" />
    </TabsContent>
    <TabsContent value="transfer">
      <TransferForm @success="$emit('success')" />
    </TabsContent>
  </Tabs>
</template>
