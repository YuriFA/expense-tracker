<script setup lang="ts">
import {
  TransactionListItem,
  TransactionListItemSkeleton,
  useTransactions,
} from '@/entities/transaction'
import { useAccounts } from '@/entities/account'
import { useCategories } from '@/entities/category'
import { useTransactionsFilters } from '../model/use-transactions-filters'
import { useI18n } from 'vue-i18n'
import { EditTransactionDialog } from '@/features/transaction/edit'
import { DeleteTransactionDialog } from '@/features/transaction/delete'
import { ErrorState } from '@/shared/ui/error-state'
import { EmptyState } from '@/shared/ui/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Button } from '@/shared/ui/button'
import { MoreVertical, Pencil, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'

const { t } = useI18n()
const { filters } = useTransactionsFilters()
const {
  data,
  error: transactionsError,
  isLoading: isLoadingTx,
  refetch: refetchTx,
} = useTransactions(filters)
const {
  data: accounts,
  error: accountsError,
  isLoading: isLoadingAccounts,
  refetch: refetchAccounts,
} = useAccounts()
const {
  data: categories,
  error: categoriesError,
  isLoading: isLoadingCats,
  refetch: refetchCats,
} = useCategories()

const isLoading = computed(
  () => isLoadingTx.value || isLoadingAccounts.value || isLoadingCats.value,
)
const error = computed(
  () =>
    transactionsError.value || accountsError.value || categoriesError.value,
)

const refetch = () =>
  Promise.all([refetchTx(), refetchAccounts(), refetchCats()])

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
      <TransactionListItemSkeleton v-for="n in 5" :key="n" />
    </template>
    <li v-else-if="error">
      <ErrorState @retry="refetch" />
    </li>
    <li v-else-if="data && data.length === 0">
      <EmptyState :title="t('transactions.noTransactions')" />
    </li>
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
