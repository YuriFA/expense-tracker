import { Controller, useFormContext } from 'react-hook-form'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { useAccounts } from '@/entities/account/model/use-accounts'
import type { CreateTransactionFormValues } from '../model/schema'
import { OptionRow } from './option-select'

/** Source account selector for the expense/income variants. */
export function AccountField() {
  const { control } = useFormContext<CreateTransactionFormValues>()
  const accountsQuery = useAccounts()
  const accounts = accountsQuery.data ?? []

  return (
    <Controller
      control={control}
      name="accountId"
      render={({ field, fieldState }) => (
        <FormField>
          <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>Счёт</FormLabel>
          <OptionRow
            testIDPrefix="new-transaction-account"
            options={accounts.map((account) => ({ id: account.id, label: account.name }))}
            selectedId={field.value}
            onSelect={field.onChange}
          />
          <FormError testID="new-transaction-account-error">{fieldState.error?.message}</FormError>
        </FormField>
      )}
    />
  )
}
