import { Controller, useFormContext } from 'react-hook-form'
import { BottomSheetInput } from '@/shared/ui/bottom-sheet'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import type { CreateTransactionFormValues } from '../model/schema'

export function AmountField() {
  const { control } = useFormContext<CreateTransactionFormValues>()

  return (
    <Controller
      control={control}
      name="amount"
      render={({ field, fieldState }) => (
        <FormField>
          <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>Сумма</FormLabel>
          <BottomSheetInput
            placeholder="0,00"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="decimal-pad"
            invalid={Boolean(fieldState.error)}
            testID="new-transaction-amount"
          />
          <FormError testID="new-transaction-amount-error">{fieldState.error?.message}</FormError>
        </FormField>
      )}
    />
  )
}
