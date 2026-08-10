import { useEffect, useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet, type TextStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
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
 * type switch is omitted. Patches with the current `version` for optimistic
 * concurrency; on success the sheet closes and the list updates optimistically.
 *
 * Lives in `features/transaction/edit` so the later Transactions screen reuses
 * it unchanged.
 */
export function TransactionEditSheet({ transaction, visible, onClose }: TransactionEditSheetProps) {
  const { t } = useTranslation()
  const update = useUpdateTransaction()
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()

  const isTransfer = isTransferTransaction(transaction)
  const [amountText, setAmountText] = useState('')
  const [comment, setComment] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [fromAccountId, setFromAccountId] = useState<string | null>(null)
  const [toAccountId, setToAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Seed local state from the transaction whenever it is opened.
  useEffect(() => {
    if (!visible) return
    setAmountText(minorToAmountText(transaction.amount))
    setComment(transaction.description ?? '')
    setError(null)
    if (isTransferTransaction(transaction)) {
      setFromAccountId(transaction.fromAccountId)
      setToAccountId(transaction.toAccountId)
    } else {
      setAccountId(transaction.accountId)
      setCategoryId(transaction.categoryId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, transaction.id])

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
    amountMinor !== null &&
    !mismatch &&
    (isTransfer
      ? Boolean(fromAccountId && toAccountId && fromAccountId !== toAccountId)
      : Boolean(accountId && categoryId))

  const handleSave = async () => {
    if (!canSave || amountMinor === null) return
    setError(null)
    const base = {
      version: transaction.version,
      amount: amountMinor,
      description: comment.trim(),
    }
    const payload: UpdateTransactionPayload = isTransfer
      ? { ...base, fromAccountId: fromAccountId!, toAccountId: toAccountId! }
      : { ...base, accountId: accountId!, categoryId: categoryId! }

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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {isTransfer ? (
          <>
            <FieldLabel label={t('addTransfer.fromAccountLabel')} />
            <AccountChips
              accounts={accounts ?? []}
              selectedId={fromAccountId}
              onSelect={setFromAccountId}
              accessibilityLabel={t('addTransfer.fromAccountLabel')}
            />
            <FieldLabel label={t('addTransfer.toAccountLabel')} style={styles.gap} />
            <AccountChips
              accounts={accounts ?? []}
              selectedId={toAccountId}
              onSelect={setToAccountId}
              accessibilityLabel={t('addTransfer.toAccountLabel')}
            />
          </>
        ) : (
          <>
            <FieldLabel label={t('fields.account')} />
            <AccountChips
              accounts={accounts ?? []}
              selectedId={accountId}
              onSelect={setAccountId}
              accessibilityLabel={t('fields.account')}
            />
            <FieldLabel label={t('fields.category')} style={styles.gap} />
            <CategoryGrid
              categories={gridCategories}
              selectedId={categoryId}
              onSelect={setCategoryId}
              accessibilityLabel={t('fields.category')}
            />
          </>
        )}

        <FieldLabel label={t('fields.amount')} style={styles.gap} />
        <AmountField
          value={amountText}
          onChangeText={(text) => {
            setAmountText(sanitizeAmountInput(text))
            setError(null)
          }}
          currency={amountCurrency}
          size="field"
          accessibilityLabel={t('fields.amount')}
        />

        <FieldLabel label={t('addTransaction.descriptionLabel')} style={styles.gap} />
        <TextField
          value={comment}
          onChangeText={setComment}
          placeholder={t('home.commentPlaceholder')}
          accessibilityLabel={t('addTransaction.descriptionLabel')}
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
          onPress={() => void handleSave()}
          style={styles.flex}
        >
          {t('editTransaction.submit')}
        </Button>
      </View>
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
