<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getTransactionsOptions } from '@/entities/transaction/constants'
import AddTransactionForm from '@/features/add-transaction/AddTransactionForm.vue'
import AddTransferForm from '@/features/add-transfer/AddTransferForm.vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

const { t } = useI18n()

const transactionTypes = getTransactionsOptions()

const onSuccess = () => {
  toast.success(t('addTransaction.success'))
}
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
    </CardContent>
  </Card>
</template>
