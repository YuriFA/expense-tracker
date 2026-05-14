import { useAccountsStore } from '@/stores/use-accounts-store'
import { useTransactionsStore } from '@/stores/use-transactions-store'
import type { CashflowTransaction } from '@/entities/transaction/types'
import { computed } from 'vue'

export const useLastUsedAccountId = () => {
  const accounts = useAccountsStore()
  const transactions = useTransactionsStore()

  return computed(() => {
    const transaction = transactions.items.findLast(
      (item): item is CashflowTransaction =>
        item.type !== 'transfer' && Boolean(accounts.findById(item.accountId)),
    )

    return transaction?.accountId
  })
}
