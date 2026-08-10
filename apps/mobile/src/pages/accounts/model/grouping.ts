import type { AccountWithBalance } from '@expense-tracker/api'
import type { CurrencyCode } from '@expense-tracker/money'

/**
 * A currency section of the Accounts screen (design section 7: "account cards
 * with balance, grouped by currency, with a total per currency"). The total is
 * the sum of the group's computed balances in minor units - the per-account
 * balances themselves come from the shared money calculator (in the repository),
 * so the section total is a straight integer sum, no FX.
 */
export interface AccountCurrencyGroup {
  currency: CurrencyCode
  /** Sum of `balance` across the group's accounts (minor units). */
  total: number
  accounts: AccountWithBalance[]
}

/**
 * Group accounts by currency, preserving first-seen order, with a per-currency
 * total. Pure (no React) so it is trivially testable and memoizable.
 */
export function groupAccountsByCurrency(
  accounts: AccountWithBalance[],
): AccountCurrencyGroup[] {
  const order: CurrencyCode[] = []
  const totals = new Map<CurrencyCode, number>()
  const lists = new Map<CurrencyCode, AccountWithBalance[]>()

  for (const account of accounts) {
    let list = lists.get(account.currency)
    if (!list) {
      list = []
      lists.set(account.currency, list)
      totals.set(account.currency, 0)
      order.push(account.currency)
    }
    list.push(account)
    totals.set(account.currency, (totals.get(account.currency) ?? 0) + account.balance)
  }

  return order.map((currency) => ({
    currency,
    total: totals.get(currency) ?? 0,
    accounts: lists.get(currency) ?? [],
  }))
}
