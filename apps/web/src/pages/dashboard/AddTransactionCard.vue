<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getTransactionsOptions } from '@/entities/transaction/constants'
import AddTransactionForm from '@/features/add-transaction/AddTransactionForm.vue'
import AddTransferForm from '@/features/add-transfer/AddTransferForm.vue'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { useTransactionsStore } from '@/stores/use-transactions-store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

const { t } = useI18n()

const transactionTypes = getTransactionsOptions()
const transactions = useTransactionsStore()
const accounts = useAccountsStore()
const isReady = computed(() => !accounts.isLoading && !transactions.isLoading)

const handleSuccess = () => {
  toast.success(t('addTransaction.success'))
}
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
          <AddTransactionForm type="expense" @success="handleSuccess" />
        </TabsContent>
        <TabsContent value="income">
          <AddTransactionForm type="income" @success="handleSuccess" />
        </TabsContent>
        <TabsContent value="transfer">
          <AddTransferForm @success="handleSuccess" />
        </TabsContent>
      </Tabs>
      <Spinner v-else class="mx-auto" />
    </CardContent>
  </Card>
</template>
