// The create-transaction form: one discriminated-union schema, three flows
// (expense / income / transfer) in the redesigned keypad sheet. The amount is
// edited exclusively through the custom keypad - the amount never renders a
// TextInput, so no system keyboard for it; the note is the only native input.
// Amount stays a string in form values; `toTransactionPayload` converts to
// int64 minor units at the submission boundary (conventions forms.md §2/§4).
// Picker sheets stack above this one and report selections through setValue -
// nothing else in the form state is touched by opening or closing them.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import type { CreateTransactionPayload } from '@expense-tracker/api'
import { FormError } from '@/shared/ui/form'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { DEFAULT_CURRENCY } from '@/shared/lib/format/format'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'
import { useAccounts } from '@/entities/account/model/use-accounts'
import { useCategories } from '@/entities/category/model/use-categories'
import { useCreateTransaction } from '@/entities/transaction/model/use-transactions'
import { applyKeypadInput, type KeypadKey } from '../model/amount-keypad'
import { occurredAtForDaysAgo } from '../model/quick-dates'
import {
  createTransactionDefaultValues,
  createTransactionSchema,
  type CreateTransactionFormValues,
  type TransactionFlowKind,
} from '../model/schema'
import { AccountPickerSheet } from './account-picker-sheet'
import { AccountSelectorRow } from './account-selector-row'
import { AmountDisplay } from './amount-display'
import { AmountKeypad } from './amount-keypad'
import { CategoryPickerSheet } from './category-picker-sheet'
import { CategoryQuickBar } from './category-quick-bar'
import { DatePickerSheet } from './date-picker-sheet'
import { DateButton, QuickDateRow } from './date-selector-row'
import { NoteButton, NoteInput } from './note-field'
import { TransactionSubmitButton } from './transaction-submit-button'

function toTransactionPayload(values: CreateTransactionFormValues): CreateTransactionPayload {
  const base = {
    // The schema's refine guarantees parseability; the fallback only
    // satisfies the parser's `number | null` return type.
    amount: parseMajorUnitsToMinor(values.amount) ?? 0,
    description: values.description.trim(),
    occurredAt: values.occurredAt,
  }

  if (values.kind === 'transfer') {
    return {
      type: 'transfer',
      ...base,
      fromAccountId: values.fromAccountId,
      toAccountId: values.toAccountId,
    }
  }

  return {
    type: values.kind,
    ...base,
    accountId: values.accountId,
    categoryId: values.categoryId,
  }
}

interface NewTransactionFormProps {
  kind: TransactionFlowKind
  onSuccess: () => void
}

export function NewTransactionForm({ kind, onSuccess }: NewTransactionFormProps) {
  const form = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: createTransactionDefaultValues(kind),
    // Live validity drives the submit button's disabled state (the reference
    // UX): it unlocks only once every required field of the flow is set.
    mode: 'onChange',
  })
  const createTransaction = useCreateTransaction()
  const accountsQuery = useAccounts()
  const accounts = accountsQuery.data ?? []
  const flowCategories = useCategories(kind === 'transfer' ? undefined : kind).data ?? []

  const accountPickerRef = useRef<BottomSheetRef>(null)
  const fromPickerRef = useRef<BottomSheetRef>(null)
  const toPickerRef = useRef<BottomSheetRef>(null)
  const categoryPickerRef = useRef<BottomSheetRef>(null)
  const datePickerRef = useRef<BottomSheetRef>(null)

  // Ephemeral UI state only - the values themselves live in the form.
  const [noteOpen, setNoteOpen] = useState(false)
  const [quickDatesOpen, setQuickDatesOpen] = useState(false)

  const defaultValues = useMemo(() => createTransactionDefaultValues(kind), [kind])

  // reset() does not re-run the resolver, so formState.isValid (the submit's
  // disabled source) would keep its pre-reset value until the next edit;
  // trigger() recomputes it against the fresh defaults.
  const resetForm = useCallback(
    (values: CreateTransactionFormValues) => {
      form.reset(values)
      void form.trigger()
    },
    [form],
  )

  // Re-initialize the form whenever a new flow opens from the speed dial.
  useEffect(() => {
    resetForm(defaultValues)
    setNoteOpen(false)
    setQuickDatesOpen(false)
  }, [defaultValues, resetForm])

  // Per-field watches: the union's variant-specific keys are only observable
  // through their own paths (undefined while the other variant is active).
  const amount = useWatch({ control: form.control, name: 'amount' }) ?? ''
  const description = useWatch({ control: form.control, name: 'description' }) ?? ''
  const occurredAt =
    useWatch({ control: form.control, name: 'occurredAt' }) ?? defaultValues.occurredAt
  const accountId = useWatch({ control: form.control, name: 'accountId' }) ?? ''
  const fromAccountId = useWatch({ control: form.control, name: 'fromAccountId' }) ?? ''
  const toAccountId = useWatch({ control: form.control, name: 'toAccountId' }) ?? ''
  const categoryId = useWatch({ control: form.control, name: 'categoryId' }) ?? ''
  const hasNote = description.trim() !== ''

  // The amount's currency follows the account the money moves from.
  const currencyAccountId = kind === 'transfer' ? fromAccountId : accountId
  const currencyAccount = accounts.find((account) => account.id === currencyAccountId)
  const currency = currencyAccount?.currency ?? DEFAULT_CURRENCY

  const selectedAccount = accounts.find((account) => account.id === accountId)
  const fromAccount = accounts.find((account) => account.id === fromAccountId)
  const toAccount = accounts.find((account) => account.id === toAccountId)

  // Destinations stay a UI-level derivation exactly as before: same currency
  // as the source, distinct from it (the schema cannot see currencies and
  // must not duplicate the rule).
  const toCandidates = fromAccount
    ? accounts.filter(
        (account) => account.currency === fromAccount.currency && account.id !== fromAccount.id,
      )
    : []

  const selectedDate = useMemo(() => new Date(occurredAt), [occurredAt])

  const handleAmountKey = (key: KeypadKey) => {
    form.setValue('amount', applyKeypadInput(form.getValues('amount'), key), {
      shouldValidate: true,
    })
  }
  const handleAccountSelect = (id: string) =>
    form.setValue('accountId', id, { shouldValidate: true })
  const handleFromSelect = (id: string) => {
    form.setValue('fromAccountId', id, { shouldValidate: true })
    // A destination that no longer matches the new source's currency is
    // cleared - the candidate rule is re-derived from the new selection.
    const from = accounts.find((account) => account.id === id)
    const to = accounts.find((account) => account.id === form.getValues('toAccountId'))
    if (from && to && to.currency !== from.currency) {
      form.setValue('toAccountId', '')
    }
  }
  const handleToSelect = (id: string) => form.setValue('toAccountId', id, { shouldValidate: true })
  const handleCategorySelect = (id: string) =>
    form.setValue('categoryId', id, { shouldValidate: true })
  const handleQuickDateSelect = (daysAgo: number) =>
    form.setValue('occurredAt', occurredAtForDaysAgo(daysAgo), { shouldValidate: true })
  const handleCalendarSelect = (date: Date) =>
    form.setValue('occurredAt', date.toISOString(), { shouldValidate: true })

  const handleSubmit = async (values: CreateTransactionFormValues) => {
    try {
      await createTransaction.mutateAsync(toTransactionPayload(values))
      // Full reset: the next open starts from the defaults, selections
      // included (the old partial reset deliberately left them behind).
      resetForm(createTransactionDefaultValues(kind))
      setNoteOpen(false)
      setQuickDatesOpen(false)
      onSuccess()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  return (
    <FormProvider {...form}>
      <View className="flex-1">
        <View className="flex-1 gap-5 px-4">
          {kind === 'transfer' ? (
            <View>
              <AccountSelectorRow
                label="Откуда"
                account={fromAccount}
                onPress={() => fromPickerRef.current?.present()}
                testID="new-transaction-from"
              />
              <AccountSelectorRow
                label="Куда"
                account={toAccount}
                disabled={!fromAccount}
                onPress={() => toPickerRef.current?.present()}
                testID="new-transaction-to"
              />
            </View>
          ) : (
            <AccountSelectorRow
              label="Счёт"
              account={selectedAccount}
              onPress={() => accountPickerRef.current?.present()}
              testID="new-transaction-account"
            />
          )}

          <View className="items-center">
            <AmountDisplay
              value={amount}
              currency={currency}
              invalid={amount !== '' && Boolean(form.formState.errors.amount)}
            />
          </View>

          {kind !== 'transfer' ? (
            <View className="gap-2">
              <CategoryQuickBar
                categories={flowCategories}
                selectedId={categoryId}
                onSelect={handleCategorySelect}
                onOpenMenu={() => categoryPickerRef.current?.present()}
              />
              {flowCategories.length === 0 ? (
                <Text variant="caption" className="text-muted-foreground">
                  Нет категорий этого типа - создайте категорию на главном экране
                </Text>
              ) : null}
            </View>
          ) : null}

          {quickDatesOpen ? (
            <QuickDateRow
              occurredAt={occurredAt}
              onSelectDaysAgo={handleQuickDateSelect}
              onOpenCalendar={() => datePickerRef.current?.present()}
            />
          ) : null}
          {noteOpen ? <NoteInput /> : null}

          <View className="flex-row items-center justify-between">
            <NoteButton
              open={noteOpen}
              hasNote={hasNote}
              onToggle={() => setNoteOpen((open) => !open)}
            />
            <DateButton
              occurredAt={occurredAt}
              expanded={quickDatesOpen}
              onToggle={() => setQuickDatesOpen((open) => !open)}
            />
            <TransactionSubmitButton
              disabled={!form.formState.isValid}
              loading={form.formState.isSubmitting || createTransaction.isPending}
              onPress={form.handleSubmit(handleSubmit)}
            />
          </View>

          {accounts.length === 0 ? (
            <View className="flex-row items-center gap-2">
              <Icon name="information-circle" size={16} colorClassName="accent-muted-foreground" />
              <Text variant="caption" className="flex-1 text-muted-foreground">
                Чтобы записать транзакцию, сначала создайте счёт
              </Text>
            </View>
          ) : null}

          <FormError testID="new-transaction-error">
            {form.formState.errors.root?.message}
          </FormError>
        </View>

        <AmountKeypad onKey={handleAmountKey} />

        <AccountPickerSheet
          ref={accountPickerRef}
          title="Выберите счёт"
          accounts={accounts}
          selectedId={accountId}
          onSelect={handleAccountSelect}
          testIDPrefix="new-transaction-account"
        />
        {kind === 'transfer' ? (
          <>
            <AccountPickerSheet
              ref={fromPickerRef}
              title="Откуда"
              accounts={accounts}
              selectedId={fromAccountId}
              onSelect={handleFromSelect}
              testIDPrefix="new-transaction-from"
            />
            <AccountPickerSheet
              ref={toPickerRef}
              title="Куда"
              accounts={toCandidates}
              selectedId={toAccountId}
              onSelect={handleToSelect}
              testIDPrefix="new-transaction-to"
            />
          </>
        ) : null}
        {kind !== 'transfer' ? (
          <CategoryPickerSheet
            ref={categoryPickerRef}
            categories={flowCategories}
            selectedId={categoryId}
            onSelect={handleCategorySelect}
          />
        ) : null}
        <DatePickerSheet
          ref={datePickerRef}
          selected={selectedDate}
          onSelect={handleCalendarSelect}
        />
      </View>
    </FormProvider>
  )
}
