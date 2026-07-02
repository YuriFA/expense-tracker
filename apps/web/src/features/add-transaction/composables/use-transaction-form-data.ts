import type { CashflowTransaction, TransferTransaction } from '@/entities/transaction/types'
import { useAccounts } from '@/entities/account/use-accounts'
import { useTransactions } from '@/entities/transaction/use-transactions'
import { computed } from 'vue'

export const useLastCreatedTransaction = () => {
  const { data: accounts, isLoading: accountsLoading } = useAccounts()
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({ limit: 10 })

  const lastCreatedCashflowTransaction = computed(() =>
    transactions.value?.findLast(
      (item): item is CashflowTransaction =>
        item.type !== 'transfer' && Boolean(accounts.value?.some((a) => a.id === item.accountId)),
    ),
  )

  const lastCreatedTransferTransaction = computed(() =>
    transactions.value?.findLast(
      (item): item is TransferTransaction =>
        item.type === 'transfer' &&
        Boolean(accounts.value?.some((a) => a.id === item.fromAccountId)),
    ),
  )

  const isReady = computed(() => !accountsLoading.value && !transactionsLoading.value)

  return { lastCreatedCashflowTransaction, lastCreatedTransferTransaction, isReady }
}
