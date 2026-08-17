import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { Text } from '@/shared/ui/text'
import { useAccounts } from '@/entities/account/model/use-accounts'
import type { CreateTransactionFormValues } from '../model/schema'
import { OptionRow } from './option-select'

/**
 * Transfer destination selector. Destinations stay a UI-level option-list
 * derivation exactly as before: same currency as the source, distinct from
 * it (the schema cannot see account currencies and must not duplicate the
 * rule).
 */
export function ToAccountField() {
  const { control } = useFormContext<CreateTransactionFormValues>()
  const accountsQuery = useAccounts()
  const accounts = accountsQuery.data ?? []

  const fromAccountId = useWatch({ control, name: 'fromAccountId' })
  const fromAccount = accounts.find((account) => account.id === fromAccountId)
  const toCandidates = fromAccount
    ? accounts.filter(
        (account) => account.currency === fromAccount.currency && account.id !== fromAccount.id,
      )
    : []

  return (
    <Controller
      control={control}
      name="toAccountId"
      render={({ field, fieldState }) => (
        <FormField>
          <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>Куда</FormLabel>
          {fromAccount ? (
            <OptionRow
              testIDPrefix="new-transaction-to"
              options={toCandidates.map((account) => ({ id: account.id, label: account.name }))}
              selectedId={field.value}
              onSelect={field.onChange}
            />
          ) : (
            <Text variant="body-sm" className="text-muted-foreground">
              Сначала выберите счёт списания
            </Text>
          )}
          <FormError testID="new-transaction-to-error">{fieldState.error?.message}</FormError>
        </FormField>
      )}
    />
  )
}
