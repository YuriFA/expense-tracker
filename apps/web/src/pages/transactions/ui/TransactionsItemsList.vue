<script setup lang="ts">
import {
  TransactionListItem,
  TransactionListItemSkeleton,
  useTransactions,
  type Transaction,
} from '@/entities/transaction'
import { useAccounts } from '@/entities/account'
import { useCategoriesIncludingArchived } from '@/entities/category'
import { useTransactionsFilters } from '../model/use-transactions-filters'
import { matchesTransactionsFilters } from '../lib/transactions-query'
import { useAuthorLabel } from '@/features/household-author'
import { useI18n } from 'vue-i18n'
import { EditTransactionDialog } from '@/features/transaction/edit'
import { DeleteTransactionDialog } from '@/features/transaction/delete'
import { ErrorState } from '@/shared/ui/error-state'
import { EmptyState } from '@/shared/ui/empty-state'
import { Card } from '@/shared/ui/card'
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
const authorLabel = useAuthorLabel()
const { filters } = useTransactionsFilters()
// Multi-select account/category narrowing happens client-side over this
// base query: the repository seam stays single-select (shared with mobile),
// and the base list is cache-stable while the checkbox selection changes.
const repositoryQuery = computed(() => ({
  type: filters.value.type,
  fromDate: filters.value.fromDate,
  toDate: filters.value.toDate,
}))
const {
  data,
  error: transactionsError,
  isPending: transactionsPending,
  refetch: refetchTx,
} = useTransactions(repositoryQuery)
const {
  data: accounts,
  error: accountsError,
  isPending: accountsPending,
  refetch: refetchAccounts,
} = useAccounts()
const {
  data: categories,
  error: categoriesError,
  isPending: categoriesPending,
  refetch: refetchCats,
// Including archived: this is a join over existing records -
// archived categories stay visible in history/analytics/filters.
} = useCategoriesIncludingArchived()

// Skeletons only while NO data exists yet: background refetches
// (invalidation, sync cycle) keep the rendered rows in place.
const isPending = computed(
  () => transactionsPending.value || accountsPending.value || categoriesPending.value,
)
const error = computed(
  () =>
    transactionsError.value || accountsError.value || categoriesError.value,
)

const refetch = () =>
  Promise.all([refetchTx(), refetchAccounts(), refetchCats()])

const visibleTransactions = computed(() =>
  (data.value ?? []).filter(
    (transaction) => matchesTransactionsFilters(transaction, filters.value),
  ),
)

// One dialog instance per flow, hoisted out of the row loop: the kebab sets
// the active transaction, the dialog pair reads it (same pattern as the
// dashboard's recent list).
const editOpen = ref(false)
const deleteOpen = ref(false)
const activeTransaction = ref<Transaction | null>(null)
const pendingDeleteId = ref<string | null>(null)

const openEdit = (transaction: Transaction) => {
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
  <!-- The list lives in one white card; rows stay flat divider-separated
       (warm-minimal system) and the card owns the surface. -->
  <Card class="gap-0 py-0 md:py-0">
    <ul class="divide-y divide-border">
      <template v-if="isPending">
        <TransactionListItemSkeleton v-for="n in 5" :key="n" />
      </template>
      <li v-else-if="error" class="p-4 md:p-6">
        <ErrorState @retry="refetch" />
      </li>
      <li v-else-if="visibleTransactions.length === 0" class="p-4 md:p-6">
        <EmptyState :title="t('transactions.noTransactions')" />
      </li>
      <template v-else>
        <TransactionListItem
          v-for="item in visibleTransactions"
          :key="item.id"
          :transaction="item"
          :accounts="accounts"
          :categories="categories"
          :author="authorLabel(item.authorId)"
          class="px-4 md:px-6"
        >
          <template #actions="{ transaction }">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" :aria-label="t('transactions.rowActions')">
                  <MoreVertical class="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @select="openEdit(transaction)">
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
    </ul>

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
  </Card>
</template>
