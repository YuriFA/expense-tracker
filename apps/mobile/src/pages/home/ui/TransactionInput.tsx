import { useMemo, useRef, useState } from 'react'
import { View, Pressable, TextInput, type TextStyle } from 'react-native'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Ionicons } from '@expo/vector-icons'
import { mapCategories } from '@expense-tracker/i18n'
import { DEFAULT_CURRENCY } from '@expense-tracker/money'
import {
  AmountField,
  Button,
  DayCarousel,
  PickerButton,
  SegmentedControl,
  Text,
  useTokens,
  type SegmentOption,
} from '@shared/ui'
import { CategoryPickerSheet } from '@entities/category'
import { AccountPickerSheet } from '@entities/account'
import { useCreateTransaction } from '@entities/transaction'
import {
  type AccountWithBalance,
  type Category,
  type CreateTransactionPayload,
  type RepositoryErrorMessages,
  type TransactionType,
  getRepositoryErrorMessage,
} from '@expense-tracker/api'
import { currencySymbol } from '@shared/lib/format'
import { parseAmountToMinor, sanitizeAmountInput } from '@shared/lib/amount'
import { today } from '@shared/lib/date'
import { haptics } from '@shared/lib/haptics'
import { buildDefaults, firstCategoryOf } from '../model/defaults'
import { homeFormSchema, type HomeFormValues } from '../model/form-schema'
import { lastAccountIds } from '../model/last-account'

interface TransactionInputProps {
  accounts: AccountWithBalance[]
  categories: Category[]
}

type PickerKind = 'account' | 'category' | 'from' | 'to' | null

/**
 * The focused, non-scrolling add-transaction form (Mibu-style minimal layout),
 * owned end-to-end here: `useForm` + zod resolver, every field, and the pinned
 * Save action. Top to bottom - everything fits one viewport with the keypad up:
 *
 *   1. Date carousel (today selected by default) - drives `occurredAt`.
 *   2. Type segmented control (expense / income / transfer).
 *   3. Hero amount - the visual centerpiece; grows/shrinks to fill leftover
 *      space so the screen never overflows when the keypad appears.
 *   4. Controls row - account + category buttons (cashflow) or From/To + swap
 *      (transfer); each button opens a native bottom-sheet picker.
 *
 * The zod schema ({@link homeFormSchema}) owns every save rule, so
 * `formState.isValid` IS the save gate and the cross-currency / same-account
 * caption reads straight from `errors.fromAccountId` - no hand-rolled `canSave`
 * or `transferCurrencyMismatch`. Because {@link HomeScreen} only mounts this
 * once the reference data is loaded, `defaultValues` (last-used preselected) are
 * correct on first paint and need no re-seeding effect.
 */
export function TransactionInput({ accounts, categories }: TransactionInputProps) {
  const { t } = useTranslation()
  const tokens = useTokens()
  const createTransaction = useCreateTransaction()
  const amountRef = useRef<TextInput>(null)
  const [picker, setPicker] = useState<PickerKind>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<HomeFormValues>({
    resolver: zodResolver(homeFormSchema(t, accounts)),
    mode: 'onChange',
    defaultValues: buildDefaults(accounts, categories),
  })
  const { control, handleSubmit, setValue, getValues, formState } = form
  const { isValid, errors } = formState

  const type = useWatch({ control, name: 'type' })
  const accountId = useWatch({ control, name: 'accountId' }) ?? null
  const categoryId = useWatch({ control, name: 'categoryId' }) ?? null
  const fromAccountId = useWatch({ control, name: 'fromAccountId' }) ?? null
  const toAccountId = useWatch({ control, name: 'toAccountId' }) ?? null
  const date = useWatch({ control, name: 'date' }) ?? today()

  const isTransfer = type === 'transfer'

  // The amount currency follows the relevant account; the transfer From drives
  // it so the hero symbol matches the money leaving the source account.
  const amountCurrency = isTransfer
    ? accounts.find((account) => account.id === fromAccountId)?.currency ?? DEFAULT_CURRENCY
    : accounts.find((account) => account.id === accountId)?.currency ?? DEFAULT_CURRENCY

  // Live transfer-account error straight from the zod resolver (shown once both
  // From and To are picked). Covers both "must differ" and "same currency".
  const transferError =
    isTransfer && fromAccountId && toAccountId ? errors.fromAccountId?.message : undefined

  // Localize seed category names once; filter by active type for the grid/picker.
  const localizedCategories = useMemo(
    () => mapCategories(categories, (key) => t(key)),
    [categories, t],
  )
  const gridCategories = useMemo(
    () => localizedCategories.filter((category) => category.type === type),
    [localizedCategories, type],
  )

  const selectedCategory = localizedCategories.find((category) => category.id === categoryId) ?? null
  const selectedAccount = accounts.find((account) => account.id === accountId) ?? null
  const fromAccount = accounts.find((account) => account.id === fromAccountId) ?? null
  const toAccount = accounts.find((account) => account.id === toAccountId) ?? null

  // The category grid is filtered by type, so a switch drops a no-longer-fitting
  // category in favor of the first one of the new type. Everything else (amount,
  // From/To defaults) is already correct from `defaultValues`.
  const handleTypeChange = (next: TransactionType) => {
    setValue('type', next, { shouldValidate: true })
    const current = getValues('categoryId')
    const stillValid = categories.some(
      (category) => category.id === current && category.type === next,
    )
    if (!stillValid) {
      setValue('categoryId', firstCategoryOf(categories, next), { shouldValidate: true })
    }
  }

  const handleSwap = () => {
    const { fromAccountId: from, toAccountId: to } = getValues()
    setValue('fromAccountId', to, { shouldValidate: true })
    setValue('toAccountId', from, { shouldValidate: true })
  }

  const onSubmit = async (values: HomeFormValues) => {
    // `handleSubmit` already ran the zod gate, so the amount parses; guard anyway.
    const minor = parseAmountToMinor(values.amountText)
    if (minor === null) return
    setError(null)
    const occurredAt = combineDateWithNow(values.date).toISOString()

    try {
      if (values.type === 'transfer') {
        if (!values.fromAccountId || !values.toAccountId) return
        const payload: CreateTransactionPayload = {
          type: 'transfer',
          amount: minor,
          fromAccountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          description: '',
          occurredAt,
        }
        await createTransaction.mutateAsync(payload)
        lastAccountIds.setTransferAccountIds(values.fromAccountId, values.toAccountId)
      } else {
        if (!values.accountId || !values.categoryId) return
        const payload: CreateTransactionPayload = {
          type: values.type,
          amount: minor,
          accountId: values.accountId,
          categoryId: values.categoryId,
          description: '',
          occurredAt,
        }
        await createTransaction.mutateAsync(payload)
        lastAccountIds.setCashflowAccountId(values.accountId)
      }

      // Serial entry: clear the amount only and reset the date to today (the
      // next entry is usually "now"); account + category + type persist.
      setValue('amountText', '', { shouldValidate: true })
      setValue('date', today())
      haptics.notify('success')
      amountRef.current?.focus()
    } catch (mutationError) {
      setError(getRepositoryErrorMessage(mutationError, repositoryErrorMessages(t)))
      haptics.notify('warning')
    }
  }

  const submitLabel = isTransfer ? t('addTransfer.submit') : t('addTransaction.submit')

  return (
    <View className="flex-1 flex-col">
      <View className="flex-1 flex-col px-4 gap-2.5">
        {false && <DayCarousel
          value={date}
          onChange={(next) => setValue('date', next)}
          maxDate={today()}
          accessibilityLabel={t('home.dateCarousel')}
        />}

        <SegmentedControl
          options={typeOptions(t)}
          value={type}
          onChange={handleTypeChange}
          accessibilityLabel={t('fields.transactionType')}
        />

        <Button variant="ghost" onPress={() => {
          handleTypeChange('income')

        }}>123</Button>

        {/* Hero amount - the centerpiece; absorbs leftover vertical space. */}
        <View className="flex-1 items-center justify-center">
          <Controller
            control={control}
            name="amountText"
            render={({ field: { value, onChange } }) => (
              <AmountField
                ref={amountRef}
                value={value}
                onChangeText={(text) => onChange(sanitizeAmountInput(text))}
                currency={amountCurrency}
                autoFocus
                accessibilityLabel={t('fields.amount')}
              />
            )}
          />
          {transferError ? (
            <Text size="caption" tone="destructive" style={styles.caption}>
              {transferError}
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
            <SwapButton onPress={handleSwap} />
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
              leading={selectedCategory ? <Text size="title">{selectedCategory.icon}</Text> : null}
              placeholder={t('addTransaction.categoryPlaceholder')}
              onPress={() => setPicker('category')}
              accessibilityLabel={t('fields.category')}
            />
          </View>
        )}
      </View>

      <View
        className="px-4 pt-2 pb-2 gap-1.5"
        style={{ borderTopColor: tokens.border, borderTopWidth: 1 }}
      >
        {error ? (
          <Text size="caption" tone="destructive" style={{ textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}
        <Button
          full
          size="lg"
          accessibilityLabel={submitLabel}
          disabled={!isValid}
          loading={createTransaction.isPending}
          onPress={() => void handleSubmit(onSubmit)()}
        >
          {submitLabel}
        </Button>
      </View>

      <CategoryPickerSheet
        visible={picker === 'category'}
        onClose={() => setPicker(null)}
        title={t('home.chooseCategory')}
        categories={gridCategories}
        selectedId={categoryId}
        onSelect={(id) => setValue('categoryId', id, { shouldValidate: true })}
      />
      <AccountPickerSheet
        visible={picker === 'account'}
        onClose={() => setPicker(null)}
        title={t('home.chooseAccount')}
        accounts={accounts}
        selectedId={accountId}
        onSelect={(id) => setValue('accountId', id, { shouldValidate: true })}
      />
      <AccountPickerSheet
        visible={picker === 'from'}
        onClose={() => setPicker(null)}
        title={t('addTransfer.fromAccountLabel')}
        accounts={accounts}
        selectedId={fromAccountId}
        onSelect={(id) => setValue('fromAccountId', id, { shouldValidate: true })}
      />
      <AccountPickerSheet
        visible={picker === 'to'}
        onClose={() => setPicker(null)}
        title={t('addTransfer.toAccountLabel')}
        accounts={accounts}
        selectedId={toAccountId}
        onSelect={(id) => setValue('toAccountId', id, { shouldValidate: true })}
      />
    </View>
  )
}

const typeOptions = (
  t: TFunction,
): readonly SegmentOption<TransactionType>[] => [
    { value: 'expense', label: t('transactions.types.expense') },
    { value: 'income', label: t('transactions.types.income') },
    { value: 'transfer', label: t('transactions.types.transfer') },
  ]

const styles = {
  caption: {
    marginTop: 8,
    textAlign: 'center',
  } as TextStyle,
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

function repositoryErrorMessages(t: TFunction): RepositoryErrorMessages {
  return {
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
}

/**
 * Combine the selected calendar day with the current wall-clock time, so a
 * same-day entry sorts by the moment it was recorded and a back-dated entry
 * still carries a sensible (sortable) time component on its day. Local time,
 * matching the carousel's calendar-day model.
 */
function combineDateWithNow(day: Date): Date {
  const now = new Date()
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  )
}
