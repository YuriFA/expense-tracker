<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  TransactionListItem,
  isTransferTransaction,
  useTransactions,
  type CashflowTransaction,
  type Transaction,
} from '@/entities/transaction'
import { useAccounts } from '@/entities/account'
import { useCategories } from '@/entities/category'
import { EditTransactionDialog } from '@/features/edit-transaction'
import { DeleteTransactionDialog } from '@/features/delete-transaction'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Button } from '@/shared/ui/button'
import { MoreVertical, Pencil, Trash2 } from '@lucide/vue'
import { ref } from 'vue'

const { t } = useI18n()
const { data, error, isLoading } = useTransactions({ limit: 5 })
const { data: accounts } = useAccounts()
const { data: categories } = useCategories()

const editOpen = ref(false)
const deleteOpen = ref(false)
const activeTransaction = ref<CashflowTransaction | null>(null)
const pendingDeleteId = ref<string | null>(null)

const openEdit = (transaction: Transaction) => {
  if (isTransferTransaction(transaction)) return
  activeTransaction.value = transaction
  editOpen.value = true
}

const openDelete = (transaction: Transaction) => {
  activeTransaction.value = null
  pendingDeleteId.value = transaction.id
  deleteOpen.value = true
}
</script>

<template>
  <ul class="space-y-2">
    <template v-if="isLoading">
      <li v-for="n in 5" :key="n" class="h-12 bg-gray-200 rounded animate-pulse"></li>
    </template>
    <template v-else-if="error">
      <li class="text-red-500">{{ t('transactions.errorLoadingTransactions', { error }) }}</li>
    </template>
    <template v-else-if="data && data.length === 0">
      <li class="text-gray-500">{{ t('transactions.noTransactions') }}</li>
    </template>
    <template v-else>
      <TransactionListItem
        v-for="item in data"
        :key="item.id"
        :transaction="item"
        :accounts="accounts"
        :categories="categories"
      >
        <template #actions="{ transaction }">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" :aria-label="t('common.close')">
                <MoreVertical class="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                v-if="!isTransferTransaction(transaction)"
                @select="openEdit(transaction)"
              >
                <Pencil class="size-4" />
                {{ t('editTransaction.trigger') }}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" @select="openDelete(transaction)">
                <Trash2 class="size-4" />
                {{ t('deleteTransaction.trigger') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </TransactionListItem>
    </template>

    <EditTransactionDialog
      v-if="activeTransaction"
      v-model:open="editOpen"
      :transaction="activeTransaction"
    />
    <DeleteTransactionDialog
      v-if="pendingDeleteId"
      v-model:open="deleteOpen"
      :transaction-id="pendingDeleteId"
    />
  </ul>
</template>
