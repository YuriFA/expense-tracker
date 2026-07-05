<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { useI18n } from 'vue-i18n'
import type { CashflowTransaction } from '@/entities/transaction'
import EditTransactionForm from './EditTransactionForm.vue'

const { transaction } = defineProps<{
  transaction: CashflowTransaction
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()

const handleSuccess = () => {
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('editTransaction.title') }}</DialogTitle>
      </DialogHeader>
      <EditTransactionForm
        :id="transaction.id"
        :type="transaction.type"
        :amount="transaction.amount"
        :description="transaction.description ?? ''"
        :account-id="transaction.accountId"
        :category-id="transaction.categoryId"
        @success="handleSuccess"
      />
    </DialogContent>
  </Dialog>
</template>
