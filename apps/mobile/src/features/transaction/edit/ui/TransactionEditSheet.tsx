import { useEffect, useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, type TextStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { mapCategories } from '@expense-tracker/i18n'
import {
  BottomSheet,
  Button,
  AmountField,
  TextField,
  Text,
} from '@shared/ui'
import { AccountChips } from '@entities/account'
import { CategoryGrid } from '@entities/category'
import {
  type Transaction,
  type UpdateTransactionPayload,
  isTransferTransaction,
  getRepositoryErrorMessage,
  type RepositoryErrorMessages,
} from '@expense-tracker/api'
import { useUpdateTransaction } from '@entities/transaction'
import { useAccounts } from '@entities/account'
import { useCategories } from '@entities/category'
import { DEFAULT_CURRENCY } from '@expense-tracker/money'
import { haptics } from '@shared/lib/haptics'
import { parseAmountToMinor, sanitizeAmountInput, minorToAmountText } from '@shared/lib/amount'
import { transactionEditSchema, type TransactionEditValues } from '../model/form-schema'

interface TransactionEditSheetProps {
  transaction: Transaction
  visible: boolean
  onClose: () => void
}

/**
 * Edit a transaction in a bottom sheet (design section 7: "tap item -> edit in a
 * bottom sheet"). Reuses the same canonical components as the inline input
 * (AmountField in `field` size, AccountChips, CategoryGrid), but the type is
 * fixed - changing a transaction's type is a delete+create, not an edit, so the
 * type switch is omitted.
 *
 * Field state is owned by react-hook-form (+ zod resolver); the submit patches
 * with the current `version` for optimistic concurrency. On success the sheet
 * closes and the list updates optimistically.
 *
 * Lives in `features/transaction/edit` so the Transactions screen reuses it
 * unchanged.
 */
export function TransactionEditSheet({ transaction, visible, onClose }: TransactionEditSheetProps) {
  const { t } = useTranslation()
  const update = useUpdateTransaction()
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()

  const isTransfer = isTransferTransaction(transaction)

  const buildDefaults = (): TransactionEditValues => {
    const base = {
      amount: minorToAmountText(transaction.amount),
      description: transaction.description ?? '',
    }
    if (isTransferTransaction(transaction)) {
      return {
        ...base,
        accountId: null,
        categoryId: null,
        fromAccountId: transaction.fromAccountId,
        toAccountId: transaction.toAccountId,
      }
    }
    return {
      ...base,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      fromAccountId: null,
      toAccountId: null,
    }
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<TransactionEditValues>({
    resolver: zodResolver(transactionEditSchema(t)),
    mode: 'onChange',
    defaultValues: buildDefaults(),
  })

  const amountText = useWatch({ control, name: 'amount' }) ?? ''
  const accountId = useWatch({ control, name: 'accountId' })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const fromAccountId = useWatch({ control, name: 'fromAccountId' })
  const toAccountId = useWatch({ control, name: 'toAccountId' })

  // Seed local state from the transaction whenever it is opened.
  useEffect(() => {
    if (!visible) return
    reset(buildDefaults())
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, transaction.id])

  const [error, setError] = useState<string | null>(null)

  const localizedCategories = useMemo(
    () => mapCategories(categories ?? [], (key) => t(key)),
    [categories, t],
  )
  const gridCategories = useMemo(
    () =>
      localizedCategories.filter(
        (category) => category.type === (isTransfer ? 'expense' : transaction.type),
      ),
    [localizedCategories, isTransfer, transaction.type],
  )

  const amountCurrency = useMemo(() => {
    if (isTransfer) {
      return (
        accounts?.find((account) => account.id === fromAccountId)?.currency ??
        accounts?.find((account) => account.id === transaction.fromAccountId)?.currency ??
        DEFAULT_CURRENCY
      )
    }
    return (
      accounts?.find((account) => account.id === accountId)?.currency ??
      accounts?.find((account) => account.id === transaction.accountId)?.currency ??
      DEFAULT_CURRENCY
    )
  }, [isTransfer, accounts, fromAccountId, accountId, transaction])

  const amountMinor = parseAmountToMinor(amountText)
  const mismatch =
    isTransfer &&
    Boolean(
      accounts?.find((account) => account.id === fromAccountId) &&
        accounts?.find((account) => account.id === toAccountId) &&
        accounts?.find((account) => account.id === fromAccountId)?.currency !==
          accounts?.find((account) => account.id === toAccountId)?.currency,
    )

  const canSave =
    isValid &&
    amountMinor !== null &&
    !mismatch &&
    (isTransfer
      ? Boolean(fromAccountId && toAccountId && fromAccountId !== toAccountId)
      : Boolean(accountId && categoryId))

  const clearError = () => setError(null)

  const onSubmit = async (values: TransactionEditValues) => {
    if (amountMinor === null) return
    setError(null)
    const base = {
      version: transaction.version,
      amount: amountMinor,
      description: values.description.trim(),
    }
    const payload: UpdateTransactionPayload = isTransfer
      ? { ...base, fromAccountId: values.fromAccountId!, toAccountId: values.toAccountId! }
      : { ...base, accountId: values.accountId!, categoryId: values.categoryId! }

    try {
      await update.mutateAsync({ id: transaction.id, payload })
      haptics.notify('success')
      onClose()
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
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('editTransaction.title')}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        {isTransfer ? (
          <>
            <FieldLabel label={t('addTransfer.fromAccountLabel')} />
            <Controller
              control={control}
              name="fromAccountId"
              render={({ field: { value, onChange } }) => (
                <AccountChips
                  accounts={accounts ?? []}
                  selectedId={value}
                  onSelect={(id) => {
                    onChange(id)
                    clearError()
                  }}
                  accessibilityLabel={t('addTransfer.fromAccountLabel')}
                />
              )}
            />
            <FieldLabel label={t('addTransfer.toAccountLabel')} style={styles.gap} />
            <Controller
              control={control}
              name="toAccountId"
              render={({ field: { value, onChange } }) => (
                <AccountChips
                  accounts={accounts ?? []}
                  selectedId={value}
                  onSelect={(id) => {
                    onChange(id)
                    clearError()
                  }}
                  accessibilityLabel={t('addTransfer.toAccountLabel')}
                />
              )}
            />
          </>
        ) : (
          <>
            <FieldLabel label={t('fields.account')} />
            <Controller
              control={control}
              name="accountId"
              render={({ field: { value, onChange } }) => (
                <AccountChips
                  accounts={accounts ?? []}
                  selectedId={value}
                  onSelect={(id) => {
                    onChange(id)
                    clearError()
                  }}
                  accessibilityLabel={t('fields.account')}
                />
              )}
            />
            <FieldLabel label={t('fields.category')} style={styles.gap} />
            <Controller
              control={control}
              name="categoryId"
              render={({ field: { value, onChange } }) => (
                <CategoryGrid
                  categories={gridCategories}
                  selectedId={value}
                  onSelect={(id) => {
                    onChange(id)
                    clearError()
                  }}
                  accessibilityLabel={t('fields.category')}
                />
              )}
            />
          </>
        )}

        <FieldLabel label={t('fields.amount')} style={styles.gap} />
        <Controller
          control={control}
          name="amount"
          render={({ field: { value, onChange } }) => (
            <AmountField
              value={value}
              onChangeText={(text) => {
                onChange(sanitizeAmountInput(text))
                clearError()
              }}
              currency={amountCurrency}
              size="field"
              accessibilityLabel={t('fields.amount')}
            />
          )}
        />

        <FieldLabel label={t('addTransaction.descriptionLabel')} style={styles.gap} />
        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange } }) => (
            <TextField
              value={value}
              onChangeText={(text) => {
                onChange(text)
                clearError()
              }}
              placeholder={t('home.commentPlaceholder')}
              accessibilityLabel={t('addTransaction.descriptionLabel')}
            />
          )}
        />

        {mismatch ? (
          <Text size="caption" tone="destructive" style={styles.gap}>
            {t('validation.transferAccountsMustMatchCurrency')}
          </Text>
        ) : null}
        {error ? (
          <Text size="caption" tone="destructive" style={styles.gap}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="ghost" onPress={onClose} style={styles.flex}>
          {t('deleteTransaction.cancel')}
        </Button>
        <Button
          full
          disabled={!canSave}
          loading={update.isPending}
          onPress={() => void handleSubmit(onSubmit)()}
          style={styles.flex}
        >
          {t('editTransaction.submit')}
        </Button>
      </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

function FieldLabel({ label, style }: { label: string; style?: TextStyle }) {
  return (
    <Text size="label" tone="muted" style={style}>
      {label}
    </Text>
  )
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  content: {
    gap: 8,
    paddingBottom: 16,
  },
  gap: {
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  flex: {
    flex: 1,
  },
})
