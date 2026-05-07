import { computed } from 'vue'

import { getAccountsBalances } from '@/entities/account'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { useTransactionsStore } from '@/stores/use-transactions-store'

export function useAccountBalances() {
  const accounts = useAccountsStore()
  const transactions = useTransactionsStore()

  const balancesByAccountId = computed(() =>
    getAccountsBalances(accounts.items, transactions.items),
  )
  const totalBalance = computed(() =>
    Object.values(balancesByAccountId.value).reduce((sum, balance) => sum + balance, 0),
  )

  const getAccountBalance = (accountId: string) => balancesByAccountId.value[accountId] ?? null

  return {
    balancesByAccountId,
    getAccountBalance,
    totalBalance,
  }
}
