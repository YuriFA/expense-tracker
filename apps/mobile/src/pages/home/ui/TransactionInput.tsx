import { useMemo, type RefObject } from 'react'
import { View, Pressable, StyleSheet, TextInput, type TextStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { mapCategories } from '@expense-tracker/i18n'
import {
  AmountField,
  SegmentedControl,
  TextField,
  Text,
  useTokens,
  type SegmentOption,
} from '@shared/ui'
import { AccountChips } from '@entities/account'
import { CategoryGrid } from '@entities/category'
import type { AccountWithBalance, Category, TransactionType } from '@expense-tracker/api'
import type { TransactionForm } from '../model/use-transaction-form'

interface TransactionInputProps {
  form: TransactionForm
  accounts: AccountWithBalance[]
  categories: Category[]
  /** Ref into the hero amount field, so the screen can refocus it after save. */
  amountRef: RefObject<TextInput | null>
}

/**
 * The inline Home input form (design section 7) - NOT a modal. Type segmented
 * control, the hero amount field, then type-dependent selectors (cashflow:
 * account chips + category grid; transfer: From/To chips + swap), then the
 * optional comment. The full-width Save button lives in the screen's thumb
 * zone (above the keyboard); this component owns only the field stack.
 */
export function TransactionInput({ form, accounts, categories, amountRef }: TransactionInputProps) {
  const { t } = useTranslation()

  const typeOptions: ReadonlyArray<SegmentOption<TransactionType>> = [
    { value: 'expense', label: t('transactions.types.expense') },
    { value: 'income', label: t('transactions.types.income') },
    { value: 'transfer', label: t('transactions.types.transfer') },
  ]

  // Localize the seed category names once per render; filter by active type.
  const localizedCategories = useMemo(
    () => mapCategories(categories, (key) => t(key)),
    [categories, t],
  )
  const gridCategories = useMemo(
    () => localizedCategories.filter((category) => category.type === form.type),
    [localizedCategories, form.type],
  )

  return (
    <View style={styles.container}>
      <SegmentedControl
        options={typeOptions}
        value={form.type}
        onChange={form.setType}
        accessibilityLabel={t('fields.transactionType')}
      />

      <AmountField
        ref={amountRef}
        value={form.amountText}
        onChangeText={form.setAmountText}
        currency={form.amountCurrency}
        autoFocus
        accessibilityLabel={t('fields.amount')}
      />

      {form.type === 'transfer' ? (
        <TransferAccountPickers form={form} accounts={accounts} />
      ) : (
        <View style={styles.cashflow}>
          <FieldLabel label={t('fields.account')} />
          <AccountChips
            accounts={accounts}
            selectedId={form.accountId}
            onSelect={form.setAccountId}
            accessibilityLabel={t('fields.account')}
          />
          <FieldLabel label={t('fields.category')} style={styles.sectionGap} />
          <CategoryGrid
            categories={gridCategories}
            selectedId={form.categoryId}
            onSelect={form.setCategoryId}
            accessibilityLabel={t('fields.category')}
          />
        </View>
      )}

      <TextField
        value={form.comment}
        onChangeText={form.setComment}
        placeholder={t('home.commentPlaceholder')}
        accessibilityLabel={t('addTransaction.descriptionLabel')}
        containerStyle={styles.sectionGap}
      />

      {form.transferCurrencyMismatch ? (
        <Text size="caption" tone="destructive" style={styles.error}>
          {t('validation.transferAccountsMustMatchCurrency')}
        </Text>
      ) : null}
    </View>
  )
}

function TransferAccountPickers({
  form,
  accounts,
}: {
  form: TransactionForm
  accounts: AccountWithBalance[]
}) {
  const { t } = useTranslation()

  return (
    <View style={styles.cashflow}>
      <FieldLabel label={t('addTransfer.fromAccountLabel')} />
      <AccountChips
        accounts={accounts}
        selectedId={form.fromAccountId}
        onSelect={form.setFromAccountId}
        accessibilityLabel={t('addTransfer.fromAccountLabel')}
      />
      <SwapButton onPress={form.swapTransferAccounts} />
      <FieldLabel label={t('addTransfer.toAccountLabel')} />
      <AccountChips
        accounts={accounts}
        selectedId={form.toAccountId}
        onSelect={form.setToAccountId}
        accessibilityLabel={t('addTransfer.toAccountLabel')}
      />
    </View>
  )
}

/** Swap the transfer From/To accounts - a centered 44pt touch target. */
function SwapButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation()
  const tokens = useTokens()

  return (
    <View style={styles.swapRow}>
      <View style={[styles.swapLine, { backgroundColor: tokens.border }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.swapAccounts')}
        onPress={onPress}
        hitSlop={4}
        style={({ pressed }) => [
          styles.swapBtn,
          { backgroundColor: tokens.surface, borderColor: tokens.border, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text size="body" weight={600}>
          ⇅
        </Text>
      </Pressable>
      <View style={[styles.swapLine, { backgroundColor: tokens.border }]} />
    </View>
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
  container: {
    gap: 16,
  },
  cashflow: {
    gap: 8,
  },
  sectionGap: {
    marginTop: 4,
  },
  error: {
    marginTop: 4,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
  },
  swapLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
