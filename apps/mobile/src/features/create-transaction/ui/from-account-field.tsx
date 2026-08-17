import { Controller, useFormContext } from 'react-hook-form'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { useAccounts } from '@/entities/account/model/use-accounts'
import type { CreateTransactionFormValues } from '../model/schema'
import { OptionRow } from './option-select'

/** Transfer source account selector. */
export function FromAccountField() {
  const { control } = useFormContext<CreateTransactionFormValues>()
  const accountsQuery = useAccounts()
  const accounts = accountsQuery.data ?? []

  return (
    <Controller
      control={control}
      name="fromAccountId"
      render={({ field, fieldState }) => (
        <FormField>
          <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
            Откуда
          </FormLabel>
          <OptionRow
            testIDPrefix="new-transaction-from"
            options={accounts.map((account) => ({ id: account.id, label: account.name }))}
            selectedId={field.value}
            onSelect={field.onChange}
          />
          <FormError testID="new-transaction-from-error">{fieldState.error?.message}</FormError>
        </FormField>
      )}
    />
  )
}
