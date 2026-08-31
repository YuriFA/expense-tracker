<script setup lang="ts">
import { computed } from 'vue'
import { X } from '@lucide/vue'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useI18n } from 'vue-i18n'
import {
  isTransferTransaction,
  type CashflowTransaction,
  type Transaction,
  type TransferTransaction,
} from '@/entities/transaction'
import { authorLabel, useHousehold } from '@/entities/household'
import { useAuthStore } from '@/entities/session'
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

// The detail's provenance line (household-ux 3.4): unlike the compact row
// markers, the detail shows who created the record even alone in the
// household («вами») - provenance, not collaboration (design D2).
const auth = useAuthStore()
const householdQuery = useHousehold({ enabled: () => auth.isAuthenticated })
const author = computed(() => {
  if (!auth.isAuthenticated) return null
  return authorLabel(transaction.authorId, householdQuery.data.value?.members ?? [], auth.user?.id, {
    selfLabel: t('household.authorSelf'),
    includeSingleMember: true,
  })
})

const handleSuccess = () => {
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[400px]" :show-close-button="false">
      <DialogHeader class="-mx-6 -mt-6 flex-row items-start justify-between border-b px-6 pb-4 pt-6">
        <div class="flex flex-col gap-1">
          <DialogTitle>{{ t('editTransaction.title') }}</DialogTitle>
          <p
            v-if="author"
            class="text-xs text-muted-foreground"
            :data-testid="`edit-transaction-author-${transaction.id}`"
          >
            {{ t('household.authoredBy', { name: author }) }}
          </p>
        </div>
        <DialogClose
          class="rounded-xs text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          <X class="size-5" />
          <span class="sr-only">{{ t('common.close') }}</span>
        </DialogClose>
      </DialogHeader>
      <TransferEditForm
        v-if="transfer"
        :id="transfer.id"
        :version="transfer.version"
        :amount="transfer.amount"
        :description="transfer.description ?? ''"
        :from-account-id="transfer.fromAccountId"
        :to-account-id="transfer.toAccountId"
        @success="handleSuccess"
      />
      <CashflowEditForm
        v-else-if="cashflow"
        :id="cashflow.id"
        :version="cashflow.version"
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
