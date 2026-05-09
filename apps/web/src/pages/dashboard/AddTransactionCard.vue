<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddTransactionForm from '@/features/add-transaction/AddTransactionForm.vue'
import AddTransferForm from '@/features/add-transfer/AddTransferForm.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const transactionTypes = [
  { labelKey: 'addTransaction.types.expense', value: 'expense' },
  { labelKey: 'addTransaction.types.income', value: 'income' },
  { labelKey: 'addTransaction.types.transfer', value: 'transfer' },
]
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-muted-foreground">{{ t('dashboard.newTransaction') }}</CardTitle>
    </CardHeader>

    <CardContent>
      <Tabs default-value="expense">
        <TabsList class="w-full">
          <TabsTrigger v-for="item in transactionTypes" :key="item.value" :value="item.value">
            {{ t(item.labelKey) }}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expense">
          <AddTransactionForm type="expense" />
        </TabsContent>
        <TabsContent value="income">
          <AddTransactionForm type="income" />
        </TabsContent>
        <TabsContent value="transfer">
          <AddTransferForm />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>
