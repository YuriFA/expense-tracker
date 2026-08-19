import { useRef } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { View } from 'react-native'
import { useAccounts } from '@/entities/account/model/use-accounts'
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import type { CreateTransactionFormValues } from '../model/schema'
import { AccountPickerSheet } from './account-picker-sheet'
import { AccountSelectorRow } from './account-selector-row'

/**
 * The transfer variant's source and destination selectors: both rows, both
 * picker sheets, and the same-currency candidate rule derived from the source.
 * All fromAccountId/toAccountId subscriptions live here - the root form never
 * re-renders on transfer selection changes.
 */
export function TransferFields() {
  const { control, getValues, setValue } = useFormContext<CreateTransactionFormValues>()
  const fromField = useController({ name: 'fromAccountId', control }).field
  const toField = useController({ name: 'toAccountId', control }).field
  const accounts = useAccounts().data ?? []
  const fromAccount = accounts.find((account) => account.id === fromField.value)
  const toAccount = accounts.find((account) => account.id === toField.value)
  const fromPickerRef = useRef<BottomSheetRef>(null)
  const toPickerRef = useRef<BottomSheetRef>(null)

  // Destinations stay a UI-level derivation: same currency as the source,
  // distinct from it (the schema cannot see currencies and must not duplicate
  // the rule).
  const toCandidates = fromAccount
    ? accounts.filter(
        (account) => account.currency === fromAccount.currency && account.id !== fromAccount.id,
      )
    : []

  const handleFromSelect = (id: string) => {
    setValue('fromAccountId', id, { shouldValidate: true })
    // A destination that no longer matches the new source's currency is
    // cleared - the candidate rule is re-derived from the new selection.
    const from = accounts.find((account) => account.id === id)
    const to = accounts.find((account) => account.id === getValues('toAccountId'))
    if (from && to && to.currency !== from.currency) {
      setValue('toAccountId', '')
    }
  }
  const handleToSelect = (id: string) => setValue('toAccountId', id, { shouldValidate: true })

  return (
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
      <AccountPickerSheet
        ref={fromPickerRef}
        title="Откуда"
        accounts={accounts}
        selectedId={fromField.value ?? ''}
        onSelect={handleFromSelect}
        testIDPrefix="new-transaction-from"
      />
      <AccountPickerSheet
        ref={toPickerRef}
        title="Куда"
        accounts={toCandidates}
        selectedId={toField.value ?? ''}
        onSelect={handleToSelect}
        testIDPrefix="new-transaction-to"
      />
    </View>
  )
}
