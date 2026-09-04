<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { getAddTransactionTypeOptions } from '@/entities/transaction'
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

const transactionTypes = getAddTransactionTypeOptions()
</script>

<template>
  <Tabs :default-value="preselect ?? 'expense'">
    <TabsList class="w-full">
      <TabsTrigger v-for="item in transactionTypes" :key="item.value" :value="item.value">
        {{ item.label }}
      </TabsTrigger>
    </TabsList>
    <!-- gap-0: the in-body form band owns its spacing (mt-6); the content
         gap would stack on top of it and push the hairline 16px lower than
         in the FAB dialog that hosts the same forms without tabs. -->
    <TabsContent value="expense" class="gap-0">
      <CashflowForm type="expense" @success="$emit('success')" />
    </TabsContent>
    <TabsContent value="income" class="gap-0">
      <CashflowForm type="income" @success="$emit('success')" />
    </TabsContent>
    <TabsContent value="transfer" class="gap-0">
      <TransferForm @success="$emit('success')" />
    </TabsContent>
  </Tabs>
</template>
