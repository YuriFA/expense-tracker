<script setup lang="ts">
import { useLastUsedAccountId } from '@/composables/use-last-used-account-id'
import AccountsListFields from './components/AccountsListFields.vue'
import AddTransactionFields from './components/AddTransactionFields.vue'
import { useForm } from 'vee-validate'
import { useTransactionsStore } from '@/stores/use-transactions-store'
import {
  createAddTransactionSchema,
  type AddTransactionFormValues,
} from './validation/add-transaction-schema'
import type { CashflowTransaction } from '@/types/transaction'
import { toTypedSchema } from '@vee-validate/zod'

const transactions = useTransactionsStore()
const lasUsedAccountId = useLastUsedAccountId()

const { handleSubmit } = useForm<AddTransactionFormValues>({
  validationSchema: toTypedSchema(createAddTransactionSchema()),
  initialValues: {
    type: 'expense',
    accountId: lasUsedAccountId.value,
  },
})

const onSubmit = handleSubmit((data) => {
  transactions.addTransaction<CashflowTransaction>({
    type: data.type,
    accountId: data.accountId,
    amount: data.amount,
    description: data.description,
    categoryId: data.category,
    occurredAt: new Date().toISOString(),
  })
})
</script>

<template>
  <section>
    <form id="add-transaction-form" class="flex flex-col gap-4" @submit="onSubmit">
      <AccountsListFields />
      <AddTransactionFields />
    </form>
  </section>
</template>
