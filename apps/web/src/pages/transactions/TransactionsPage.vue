<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
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
import TransactionsBrowser from '@/features/transactions-list/TransactionsBrowser.vue'
import { useTransactionsStore } from '@/stores/use-transactions-store'
import { useAccountsStore } from '@/stores/use-accounts-store'

const { t } = useI18n()
const transactionTypes = getTransactionsOptions()
const dialogOpen = ref(false)
const transactions = useTransactionsStore()
const accounts = useAccountsStore()
const isReady = computed(() => !accounts.isLoading && !transactions.isLoading)

const handleSuccess = () => {
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
          <Button>{{ t('actions.create') }}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('addTransaction.newTransaction') }}</DialogTitle>
          </DialogHeader>
          <Tabs default-value="expense">
            <TabsList class="w-full">
              <TabsTrigger v-for="item in transactionTypes" :key="item.value" :value="item.value">
                {{ item.label }}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="expense">
              <AddTransactionForm v-if="isReady" type="expense" @success="handleSuccess" />
            </TabsContent>
            <TabsContent value="income">
              <AddTransactionForm v-if="isReady" type="income" @success="handleSuccess" />
            </TabsContent>
            <TabsContent value="transfer">
              <AddTransferForm v-if="isReady" @success="handleSuccess" />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>

    <TransactionsBrowser class="mt-6" />
  </section>
</template>
