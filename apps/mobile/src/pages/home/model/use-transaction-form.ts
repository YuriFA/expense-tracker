import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, useWatch } from 'react-hook-form'
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
import { useState } from 'react'
import { lastAccountIds } from './last-account'

interface UseTransactionFormOptions {
  accounts: AccountWithBalance[] | undefined
  categories: Category[] | undefined
}

/**
 * The Home input form: a single state machine for all three transaction types,
 * with smart defaults and serial-entry behavior.
 *
 * Field state is owned by react-hook-form (each field is a `Controller` in
 * {@link TransactionInput}); this hook owns the *business logic* on top of it -
 * the smart-default effects (last-used account/category/transfer pair), the
 * cross-currency transfer rejection, the optimistic create + rollback, and the
 * serial-entry behavior (clear the amount only on save).
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
 * localized mismatch error surfaces) - no FX at this stage. `version` is never
 * part of a create payload (the et-fix-tx-version invariant).
 */
export interface HomeFormValues {
  type: TransactionType
  amountText: string
  accountId: string | null
  categoryId: string | null
  fromAccountId: string | null
  toAccountId: string | null
  comment: string
}

const DEFAULTS: HomeFormValues = {
  type: 'expense',
  amountText: '',
  accountId: null,
  categoryId: null,
  fromAccountId: null,
  toAccountId: null,
  comment: '',
}

export function useTransactionForm({ accounts, categories }: UseTransactionFormOptions) {
  const { t } = useTranslation()
  const createTransaction = useCreateTransaction()

  const { control, setValue, getValues } = useForm<HomeFormValues>({
    defaultValues: DEFAULTS,
  })

  // Watch every field once; the business logic + the render both depend on the
  // full set, mirroring the pre-migration useState behavior.
  const type = useWatch({ control, name: 'type' }) ?? 'expense'
  const amountText = useWatch({ control, name: 'amountText' }) ?? ''
  const accountId = useWatch({ control, name: 'accountId' }) ?? null
  const categoryId = useWatch({ control, name: 'categoryId' }) ?? null
  const fromAccountId = useWatch({ control, name: 'fromAccountId' }) ?? null
  const toAccountId = useWatch({ control, name: 'toAccountId' }) ?? null
  const comment = useWatch({ control, name: 'comment' }) ?? ''

  const [error, setError] = useState<string | null>(null)

  // --- Defaults -----------------------------------------------------------

  // Cashflow account: last-used (if it still exists), else the first account.
  useEffect(() => {
    if (type === 'transfer' || accountId !== null) return
    if (!accounts || accounts.length === 0) return
    const last = lastAccountIds.getCashflowAccountId()
    const match = last ? accounts.find((account) => account.id === last) : undefined
    setValue('accountId', match ? match.id : accounts[0]!.id)
  }, [accounts, type, accountId, setValue])

  // Cashflow category: first category matching the active type.
  useEffect(() => {
    if (type === 'transfer' || categoryId !== null) return
    const firstOfType = categories?.find((category) => category.type === type)
    if (firstOfType) {
      setValue('categoryId', firstOfType.id)
    }
  }, [categories, type, categoryId, setValue])

  // Transfer From/To: last-used pair (validated), else the first two accounts.
  useEffect(() => {
    if (type !== 'transfer') return
    if (!accounts || accounts.length === 0) return
    if (fromAccountId === null) {
      const last = lastAccountIds.getTransferAccountIds().fromAccountId
      const match = last ? accounts.find((account) => account.id === last) : undefined
      setValue('fromAccountId', match ? match.id : accounts[0]!.id)
    }
    if (toAccountId === null) {
      const last = lastAccountIds.getTransferAccountIds().toAccountId
      const match = last ? accounts.find((account) => account.id === last) : undefined
      setValue('toAccountId', match ? match.id : accounts[1]?.id ?? accounts[0]!.id)
    }
  }, [accounts, type, fromAccountId, toAccountId, setValue])

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
      setValue('type', next)
      setError(null)
      if (next === 'expense' || next === 'income') {
        // Keep the category only if it still matches the new type.
        const stillValid = categories?.some(
          (category) => category.id === categoryId && category.type === next,
        )
        if (!stillValid) {
          const firstOfType = categories?.find((category) => category.type === next)
          setValue('categoryId', firstOfType?.id ?? null)
        }
      }
    },
    [categories, categoryId, setValue],
  )

  const setAmountText = useCallback(
    (text: string) => {
      setValue('amountText', sanitizeAmountInput(text))
      setError(null)
    },
    [setValue],
  )

  const swapTransferAccounts = useCallback(() => {
    const { fromAccountId: from, toAccountId: to } = getValues()
    setValue('fromAccountId', to)
    setValue('toAccountId', from)
  }, [getValues, setValue])

  const save = useCallback(async (): Promise<boolean> => {
    const values = getValues()
    const minor = parseAmountToMinor(values.amountText)
    if (!canSave || minor === null) {
      return false
    }

    const occurredAt = new Date().toISOString()
    const description = values.comment.trim()

    try {
      if (values.type === 'transfer') {
        if (!values.fromAccountId || !values.toAccountId) return false
        const payload: CreateTransactionPayload = {
          type: 'transfer',
          amount: minor,
          fromAccountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          description,
          occurredAt,
        }
        await createTransaction.mutateAsync(payload)
        lastAccountIds.setTransferAccountIds(values.fromAccountId, values.toAccountId)
      } else {
        if (!values.accountId || !values.categoryId) return false
        const payload: CreateTransactionPayload = {
          type: values.type,
          amount: minor,
          accountId: values.accountId,
          categoryId: values.categoryId,
          description,
          occurredAt,
        }
        await createTransaction.mutateAsync(payload)
        lastAccountIds.setCashflowAccountId(values.accountId)
      }

      // Serial entry: clear the amount only; account + category + type remain.
      setValue('amountText', '')
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
  }, [canSave, createTransaction, getValues, setValue, t])

  return {
    control,
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
    swapTransferAccounts,
    save,
  }
}

export type TransactionForm = ReturnType<typeof useTransactionForm>
