import { useMemo, useState, type RefObject } from 'react'
import { View, Pressable, TextInput } from 'react-native'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { mapCategories } from '@expense-tracker/i18n'
import {
  AmountField,
  DayCarousel,
  PickerButton,
  SegmentedControl,
  Text,
  useTokens,
  type SegmentOption,
} from '@shared/ui'
import { CategoryPickerSheet } from '@entities/category'
import { AccountPickerSheet } from '@entities/account'
import { currencySymbol } from '@shared/lib/format'
import { today } from '@shared/lib/date'
import type { AccountWithBalance, Category, TransactionType } from '@expense-tracker/api'
import type { TransactionForm } from '../model/use-transaction-form'

interface TransactionInputProps {
  form: TransactionForm
  accounts: AccountWithBalance[]
  categories: Category[]
  /** Ref into the hero amount field, so the screen can refocus it after save. */
  amountRef: RefObject<TextInput | null>
}

type PickerKind = 'account' | 'category' | 'from' | 'to' | null

/**
 * The focused, non-scrolling add-transaction form (Mibu-style minimal layout).
 * Top to bottom - everything fits one viewport with the keypad up:
 *
 *   1. Date carousel (today selected by default) - drives `occurredAt`.
 *   2. Type segmented control (expense / income / transfer).
 *   3. Hero amount - the visual centerpiece; grows/shrinks to fill leftover
 *      space so the screen never overflows when the keypad appears.
 *   4. Controls row - account + category buttons (cashflow) or From/To + swap
 *      (transfer); each button opens a native bottom-sheet picker.
 *
 * No note field on the create surface (it stays reachable via the edit sheet);
 * the balance header moved off Home to satisfy the no-scroll constraint. The
 * Save button lives in the screen's pinned thumb zone.
 */
export function TransactionInput({ form, accounts, categories, amountRef }: TransactionInputProps) {
  const { t } = useTranslation()
  const [picker, setPicker] = useState<PickerKind>(null)

  const typeOptions: readonly SegmentOption<TransactionType>[] = [
    { value: 'expense', label: t('transactions.types.expense') },
    { value: 'income', label: t('transactions.types.income') },
    { value: 'transfer', label: t('transactions.types.transfer') },
  ]

  // Localize seed category names once; filter by active type for the grid/picker.
  const localizedCategories = useMemo(
    () => mapCategories(categories, (key) => t(key)),
    [categories, t],
  )
  const gridCategories = useMemo(
    () => localizedCategories.filter((category) => category.type === form.type),
    [localizedCategories, form.type],
  )

  const selectedCategory =
    localizedCategories.find((category) => category.id === form.categoryId) ?? null
  const selectedAccount = accounts.find((account) => account.id === form.accountId) ?? null
  const fromAccount = accounts.find((account) => account.id === form.fromAccountId) ?? null
  const toAccount = accounts.find((account) => account.id === form.toAccountId) ?? null

  const isTransfer = form.type === 'transfer'

  return (
    <>
      <View className="flex-1 flex-col px-4 gap-2.5">
        <DayCarousel
          value={form.date}
          onChange={form.setDate}
          maxDate={today()}
          accessibilityLabel={t('home.dateCarousel')}
        />

        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <SegmentedControl
              options={typeOptions}
              value={field.value}
              onChange={(next) => form.setType(next)}
              accessibilityLabel={t('fields.transactionType')}
            />
          )}
        />

        {/* Hero amount - the centerpiece; absorbs leftover vertical space. */}
        <View className="flex-1 items-center justify-center">
          <Controller
            control={form.control}
            name="amountText"
            render={({ field }) => (
              <AmountField
                ref={amountRef}
                value={field.value}
                onChangeText={(text) => form.setAmountText(text)}
                currency={form.amountCurrency}
                autoFocus
                accessibilityLabel={t('fields.amount')}
              />
            )}
          />
          {form.transferCurrencyMismatch ? (
            <Text size="caption" tone="destructive" style={{ marginTop: 8, textAlign: 'center' }}>
              {t('validation.transferAccountsMustMatchCurrency')}
            </Text>
          ) : null}
        </View>

        {isTransfer ? (
          <View className="flex-row items-center gap-2.5">
            <PickerButton
              label={t('addTransfer.fromAccountLabel')}
              value={fromAccount?.name}
              onPress={() => setPicker('from')}
              accessibilityLabel={t('addTransfer.fromAccountLabel')}
            />
            <SwapButton onPress={form.swapTransferAccounts} />
            <PickerButton
              label={t('addTransfer.toAccountLabel')}
              value={toAccount?.name}
              onPress={() => setPicker('to')}
              accessibilityLabel={t('addTransfer.toAccountLabel')}
            />
          </View>
        ) : (
          <View className="flex-row items-center gap-2.5">
            <PickerButton
              label={t('fields.account')}
              value={selectedAccount?.name}
              leading={
                selectedAccount ? (
                  <Text size="label" weight={600} tone="muted">
                    {currencySymbol(selectedAccount.currency)}
                  </Text>
                ) : null
              }
              placeholder={t('addTransaction.accountPlaceholder')}
              onPress={() => setPicker('account')}
              accessibilityLabel={t('fields.account')}
            />
            <PickerButton
              label={t('fields.category')}
              value={selectedCategory?.name}
              leading={
                selectedCategory ? <Text size="title">{selectedCategory.icon}</Text> : null
              }
              placeholder={t('addTransaction.categoryPlaceholder')}
              onPress={() => setPicker('category')}
              accessibilityLabel={t('fields.category')}
            />
          </View>
        )}
      </View>

      <CategoryPickerSheet
        visible={picker === 'category'}
        onClose={() => setPicker(null)}
        title={t('home.chooseCategory')}
        categories={gridCategories}
        selectedId={form.categoryId}
        onSelect={(id) => form.setValue('categoryId', id)}
      />
      <AccountPickerSheet
        visible={picker === 'account'}
        onClose={() => setPicker(null)}
        title={t('home.chooseAccount')}
        accounts={accounts}
        selectedId={form.accountId}
        onSelect={(id) => form.setValue('accountId', id)}
      />
      <AccountPickerSheet
        visible={picker === 'from'}
        onClose={() => setPicker(null)}
        title={t('addTransfer.fromAccountLabel')}
        accounts={accounts}
        selectedId={form.fromAccountId}
        onSelect={(id) => form.setValue('fromAccountId', id)}
      />
      <AccountPickerSheet
        visible={picker === 'to'}
        onClose={() => setPicker(null)}
        title={t('addTransfer.toAccountLabel')}
        accounts={accounts}
        selectedId={form.toAccountId}
        onSelect={(id) => form.setValue('toAccountId', id)}
      />
    </>
  )
}

/** Swap the transfer From/To accounts - a compact circular touch target. */
function SwapButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation()
  const tokens = useTokens()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.swapAccounts')}
      hitSlop={6}
      onPress={onPress}
      className="h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border-hairline"
      style={({ pressed }) => ({
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name="swap-horizontal" size={18} color={tokens.ink} />
    </Pressable>
  )
}
