import type { AccountWithBalance, Category, TransactionType } from '@expense-tracker/api'
import { today } from '@shared/lib/date'
import { lastAccountIds } from './last-account'
import type { HomeFormValues } from './form-schema'

/**
 * Smart-default selectors for the Home input (design section 3: last-used
 * preselected). Pure helpers used by {@link buildDefaults} (the form's
 * `defaultValues`) and the type-switch handler. They only ever *suggest* a
 * value; the form mounts only after the reference data has loaded, so these run
 * once with the real lists and never need a re-seeding effect.
 */

/** Last-used cashflow account (validated), else the first account, else null. */
function pickCashflowAccount(accounts: AccountWithBalance[]): string | null {
  if (accounts.length === 0) return null
  const last = lastAccountIds.getCashflowAccountId()
  const match = last ? accounts.find((account) => account.id === last) : undefined
  return match ? match.id : accounts[0]!.id
}

/** First category id matching `type`, else null (transfers have no category). */
function pickFirstCategory(
  categories: Category[],
  type: TransactionType,
): string | null {
  const first = categories.find((category) => category.type === type)
  return first ? first.id : null
}

/** Last-used transfer From (validated), else the first account, else null. */
function pickTransferFrom(accounts: AccountWithBalance[]): string | null {
  if (accounts.length === 0) return null
  const last = lastAccountIds.getTransferAccountIds().fromAccountId
  const match = last ? accounts.find((account) => account.id === last) : undefined
  return match ? match.id : accounts[0]!.id
}

/** Last-used transfer To (validated), else the second account, else the first. */
function pickTransferTo(accounts: AccountWithBalance[]): string | null {
  if (accounts.length === 0) return null
  const last = lastAccountIds.getTransferAccountIds().toAccountId
  const match = last ? accounts.find((account) => account.id === last) : undefined
  if (match) return match.id
  return accounts[1]?.id ?? accounts[0]!.id
}

/** Initial form values (last-used preselected). Exported for the type switch. */
export function firstCategoryOf(
  categories: Category[],
  type: TransactionType,
): string | null {
  return pickFirstCategory(categories, type)
}

/** Initial form values (last-used preselected where the data allows). */
export function buildDefaults(accounts: AccountWithBalance[], categories: Category[]): HomeFormValues {
  return {
    type: 'expense',
    amountText: '',
    accountId: pickCashflowAccount(accounts),
    categoryId: pickFirstCategory(categories, 'expense'),
    fromAccountId: pickTransferFrom(accounts),
    toAccountId: pickTransferTo(accounts),
    date: today(),
  }
}
