import { useRef } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { useAccounts } from '@/entities/account'
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { Icon } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import { Text } from '@/shared/ui/text'
import { AccountPickerSheet } from '@/shared/ui/account-picker-sheet'
import { cn } from '@/shared/lib/utils'
import type { CreateTransactionFormValues } from '../model/schema'

/**
 * The expense/income account selector: the name row at the top of the sheet
 * plus its picker sheet. The whole accountId subscription and lifecycle live
 * here - selecting an account never re-renders the rest of the form.
 */
export function AccountField() {
  const { control, setValue } = useFormContext<CreateTransactionFormValues>()
  const { field } = useController({ name: 'accountId', control })
  const accounts = useAccounts().data ?? []
  const selectedAccount = accounts.find((account) => account.id === field.value)
  const pickerRef = useRef<BottomSheetRef>(null)

  const handleSelect = (id: string) => setValue('accountId', id, { shouldValidate: true })

  return (
    <>
      <Pressable
        testID="new-transaction-account"
        accessibilityRole="button"
        accessibilityLabel={`Счет: ${selectedAccount?.name ?? 'Выберите счёт'}`}
        className="flex-row items-center gap-2 py-3"
        onPress={() => pickerRef.current?.present()}
      >
        <Text
          variant="body"
          className={cn(selectedAccount ? 'text-foreground' : 'text-muted-foreground')}
          numberOfLines={1}
        >
          {selectedAccount ? selectedAccount.name : 'Выберите счёт'}
        </Text>
        <Icon name="chevron-forward" size={16} colorClassName="accent-muted-foreground" />
      </Pressable>

      <AccountPickerSheet
        ref={pickerRef}
        title="Выберите счёт"
        accounts={accounts}
        selectedId={field.value ?? ''}
        onSelect={handleSelect}
        testIDPrefix="new-transaction-account"
      />
    </>
  )
}
