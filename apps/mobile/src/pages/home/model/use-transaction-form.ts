import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type AccountWithBalance,
  type Category,
  type CreateTransactionPayload,
  type TransactionType,
  getRepositoryErrorMessage,
  type RepositoryErrorMessages,
} from '@expense-tracker/api'
import { DEFAULT_CURRENCY, type CurrencyCode } from '@expense-tracker/money'
import { useCreateTransaction } from '@entities/transaction'
import { haptics } from '@shared/lib/haptics'
import { parseAmountToMinor, sanitizeAmountInput } from '@shared/lib/amount'
import { lastAccountIds } from './last-account'

interface UseTransactionFormOptions {
  accounts: AccountWithBalance[] | undefined
  categories: Category[] | undefined
}

/**
 * The Home input form: a single state machine for all three transaction types,
 * with smart defaults and serial-entry behavior.
 *
 * Defaults (design section 3, "last-used preselected"):
 *  - cashflow: account + category are preselected from the last save (or the
 *    first available) and *kept* across saves; only the amount clears.
 *  - transfer: From/To are preselected and remembered together.
 *
 * Serial entry: `save()` returns `true` on success after clearing only the
 * amount, so the caller refocuses the amount field and the user can log the
 * next transaction without extra taps. Account + category + type persist.
 *
 * Cross-currency transfers are rejected up front (canSave stays false and a
 * localized mismatch error surfaces) - no FX at this stage.
 */
export function useTransactionForm({ accounts, categories }: UseTransactionFormOptions) {
  const { t } = useTranslation()
  const createTransaction = useCreateTransaction()

  const [type, setTypeState] = useState<TransactionType>('expense')
  const [amountText, setAmountTextState] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [fromAccountId, setFromAccountId] = useState<string | null>(null)
  const [toAccountId, setToAccountId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  // --- Defaults -----------------------------------------------------------

  // Cashflow account: last-used (if it still exists), else the first account.
  useEffect(() => {
    if (type === 'transfer' || accountId !== null) return
    if (!accounts || accounts.length === 0) return
    const last = lastAccountIds.getCashflowAccountId()
    const match = last ? accounts.find((account) => account.id === last) : undefined
    setAccountId(match ? match.id : accounts[0]!.id)
  }, [accounts, type, accountId])

  // Cashflow category: first category matching the active type.
  useEffect(() => {
    if (type === 'transfer' || categoryId !== null) return
    const firstOfType = categories?.find((category) => category.type === type)
    if (firstOfType) {
      setCategoryId(firstOfType.id)
    }
  }, [categories, type, categoryId])

  // Transfer From/To: last-used pair (validated), else the first two accounts.
  useEffect(() => {
    if (type !== 'transfer') return
    if (!accounts || accounts.length === 0) return
    if (fromAccountId === null) {
      const last = lastAccountIds.getTransferAccountIds().fromAccountId
      const match = last ? accounts.find((account) => account.id === last) : undefined
      setFromAccountId(match ? match.id : accounts[0]!.id)
    }
    if (toAccountId === null) {
      const last = lastAccountIds.getTransferAccountIds().toAccountId
      const match = last ? accounts.find((account) => account.id === last) : undefined
      setToAccountId(match ? match.id : accounts[1]?.id ?? accounts[0]!.id)
    }
  }, [accounts, type, fromAccountId, toAccountId])

  // --- Derived ------------------------------------------------------------

  const amountMinor = useMemo(() => parseAmountToMinor(amountText), [amountText])

  const amountCurrency: CurrencyCode = useMemo(() => {
    if (type === 'transfer') {
      return accounts?.find((account) => account.id === fromAccountId)?.currency ?? DEFAULT_CURRENCY
    }
    return accounts?.find((account) => account.id === accountId)?.currency ?? DEFAULT_CURRENCY
  }, [type, accounts, fromAccountId, accountId])

  const transferCurrencyMismatch = useMemo(() => {
    if (type !== 'transfer') return false
    const from = accounts?.find((account) => account.id === fromAccountId)
    const to = accounts?.find((account) => account.id === toAccountId)
    return Boolean(from && to && from.currency !== to.currency)
  }, [type, accounts, fromAccountId, toAccountId])

  const canSave = useMemo(() => {
    if (amountMinor === null) return false
    if (type === 'transfer') {
      return (
        Boolean(fromAccountId && toAccountId) &&
        fromAccountId !== toAccountId &&
        !transferCurrencyMismatch
      )
    }
    return Boolean(accountId && categoryId)
  }, [amountMinor, type, fromAccountId, toAccountId, transferCurrencyMismatch, accountId, categoryId])

  // --- Handlers -----------------------------------------------------------

  const setType = useCallback(
    (next: TransactionType) => {
      setTypeState(next)
      setError(null)
      if (next === 'expense' || next === 'income') {
        // Keep the category only if it still matches the new type.
        const stillValid = categories?.some(
          (category) => category.id === categoryId && category.type === next,
        )
        if (!stillValid) {
          const firstOfType = categories?.find((category) => category.type === next)
          setCategoryId(firstOfType?.id ?? null)
        }
      }
    },
    [categories, categoryId],
  )

  const setAmountText = useCallback((text: string) => {
    setAmountTextState(sanitizeAmountInput(text))
    setError(null)
  }, [])

  const swapTransferAccounts = useCallback(() => {
    setFromAccountId(toAccountId)
    setToAccountId(fromAccountId)
  }, [fromAccountId, toAccountId])

  const save = useCallback(async (): Promise<boolean> => {
    if (!canSave || amountMinor === null) {
      return false
    }

    const occurredAt = new Date().toISOString()
    const description = comment.trim()

    try {
      if (type === 'transfer') {
        if (!fromAccountId || !toAccountId) return false
        const payload: CreateTransactionPayload = {
          type: 'transfer',
          amount: amountMinor,
          fromAccountId,
          toAccountId,
          description,
          occurredAt,
        }
        await createTransaction.mutateAsync(payload)
        lastAccountIds.setTransferAccountIds(fromAccountId, toAccountId)
      } else {
        if (!accountId || !categoryId) return false
        const payload: CreateTransactionPayload = {
          type,
          amount: amountMinor,
          accountId,
          categoryId,
          description,
          occurredAt,
        }
        await createTransaction.mutateAsync(payload)
        lastAccountIds.setCashflowAccountId(accountId)
      }

      // Serial entry: clear the amount only; account + category + type remain.
      setAmountTextState('')
      setError(null)
      haptics.notify('success')
      return true
    } catch (mutationError) {
      const messages: RepositoryErrorMessages = {
        notFound: t('errors.notFound'),
        hasReferences: t('errors.hasReferences'),
        invalidPayload: t('errors.invalidPayload'),
        unknownReferences: t('errors.unknownReferences'),
        versionConflict: t('errors.versionConflict'),
        alreadyExists: t('errors.alreadyExists'),
        unauthorized: t('errors.unauthorized'),
        rateLimited: t('errors.rateLimited'),
        conflict: t('errors.conflict'),
        generic: t('errors.generic'),
      }
      setError(getRepositoryErrorMessage(mutationError, messages))
      haptics.notify('warning')
      return false
    }
  }, [
    canSave,
    amountMinor,
    type,
    comment,
    fromAccountId,
    toAccountId,
    accountId,
    categoryId,
    createTransaction,
    t,
  ])

  return {
    // state
    type,
    amountText,
    accountId,
    categoryId,
    fromAccountId,
    toAccountId,
    comment,
    error,
    // derived
    amountCurrency,
    transferCurrencyMismatch,
    canSave,
    isSaving: createTransaction.isPending,
    // handlers
    setType,
    setAmountText,
    setAccountId,
    setCategoryId,
    setFromAccountId,
    setToAccountId,
    swapTransferAccounts,
    setComment,
    save,
  }
}

export type TransactionForm = ReturnType<typeof useTransactionForm>
