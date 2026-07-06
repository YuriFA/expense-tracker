<script setup lang="ts">
import { TransactionListItem, useTransactions } from '@/entities/transaction'
import { useAccounts } from '@/entities/account'
import { useCategories } from '@/entities/category'
import { useTransactionsFilters } from '../model/use-transactions-filters'
import { useI18n } from 'vue-i18n'
import { EditTransactionDialog } from '@/features/transaction/edit'
import { DeleteTransactionDialog } from '@/features/transaction/delete'
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
const { filters } = useTransactionsFilters()
const { data, error, isLoading } = useTransactions(filters)
const { data: accounts } = useAccounts()
const { data: categories } = useCategories()

const editOpen = ref(false)
const deleteOpen = ref(false)

const openEdit = () => {
  editOpen.value = true
}

const openDelete = () => {
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
              <DropdownMenuItem @select="openEdit">
                <Pencil class="size-4" />
                {{ t('editTransaction.trigger') }}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" @select="openDelete">
                <Trash2 class="size-4" />
                {{ t('deleteTransaction.trigger') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <EditTransactionDialog
            v-if="transaction"
            v-model:open="editOpen"
            :transaction="transaction"
          />
          <DeleteTransactionDialog
            v-if="transaction"
            v-model:open="deleteOpen"
            :transaction-id="transaction?.id"
          />
        </template>
      </TransactionListItem>
    </template>
  </ul>
</template>
