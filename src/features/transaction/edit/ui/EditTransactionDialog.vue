<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { useI18n } from 'vue-i18n'
import {
  isTransferTransaction,
  type CashflowTransaction,
  type Transaction,
  type TransferTransaction,
} from '@/entities/transaction'
import CashflowEditForm from './CashflowEditForm.vue'
import TransferEditForm from './TransferEditForm.vue'

const { transaction } = defineProps<{
  transaction: Transaction
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()

const isTransfer = computed(() => isTransferTransaction(transaction))
const cashflow = computed(() => (isTransfer.value ? null : (transaction as CashflowTransaction)))
const transfer = computed(() => (isTransfer.value ? (transaction as TransferTransaction) : null))

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
      <TransferEditForm
        v-if="transfer"
        :id="transfer.id"
        :amount="transfer.amount"
        :description="transfer.description ?? ''"
        :from-account-id="transfer.fromAccountId"
        :to-account-id="transfer.toAccountId"
        @success="handleSuccess"
      />
      <CashflowEditForm
        v-else-if="cashflow"
        :id="cashflow.id"
        :type="cashflow.type"
        :amount="cashflow.amount"
        :description="cashflow.description ?? ''"
        :account-id="cashflow.accountId"
        :category-id="cashflow.categoryId"
        @success="handleSuccess"
      />
    </DialogContent>
  </Dialog>
</template>
