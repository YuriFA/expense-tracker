import { useAccountsStore } from '@/stores/use-accounts-store'
import { useTransactionsStore } from '@/stores/use-transactions-store'
import type { CashflowTransaction } from '@/types/transaction'
import { useArrayFindLast } from '@vueuse/core'
import { computed } from 'vue'

export const useLastUsedAccountId = () => {
  const accounts = useAccountsStore()
  const transactions = useTransactionsStore()

  return computed(() => {
    const findedLast = useArrayFindLast(transactions.items, (item) =>
      Boolean(item.type !== 'transfer' && accounts.findById(item.accountId)),
    )

    return (findedLast.value as CashflowTransaction | undefined)?.accountId ?? accounts.items[0]?.id
  })
}
