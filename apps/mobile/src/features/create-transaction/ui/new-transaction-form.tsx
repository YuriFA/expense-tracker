// The create-transaction form: one discriminated-union schema, three flows
// (expense / income / transfer). The union's invariants replace the old
// flattened optional state and non-null assertions - the handler narrows on
// `values.kind` (conventions forms.md §2). Amount stays a string in form
// values; `toTransactionPayload` converts to int64 minor units at the
// submission boundary (§4). Repository errors surface as RU messages
// through the shared code-keyed error map (§5).

import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { View } from 'react-native'
import type { CreateTransactionPayload } from '@expense-tracker/api'
import { Button } from '@/shared/ui/button'
import { FormError } from '@/shared/ui/form'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'
import { useAccounts } from '@/entities/account/model/use-accounts'
import { useCreateTransaction } from '@/entities/transaction/model/use-transactions'
import {
  createTransactionDefaultValues,
  createTransactionSchema,
  type CreateTransactionFormValues,
  type TransactionFlowKind,
} from '../model/schema'
import { AccountField } from './account-field'
import { AmountField } from './amount-field'
import { CategoryField } from './category-field'
import { FromAccountField } from './from-account-field'
import { ToAccountField } from './to-account-field'

function toTransactionPayload(values: CreateTransactionFormValues): CreateTransactionPayload {
  const base = {
    // The schema's refine guarantees parseability; the fallback only
    // satisfies the parser's `number | null` return type.
    amount: parseMajorUnitsToMinor(values.amount) ?? 0,
    description: '',
    occurredAt: new Date().toISOString(),
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
    defaultValues: createTransactionDefaultValues[kind],
  })
  const createTransaction = useCreateTransaction()
  const accountsQuery = useAccounts()
  const accounts = accountsQuery.data ?? []

  const defaultValues = useMemo(() => createTransactionDefaultValues[kind], [kind])

  // Re-initialize the form whenever a new flow opens from the speed dial.
  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const handleSubmit = async (values: CreateTransactionFormValues) => {
    try {
      await createTransaction.mutateAsync(toTransactionPayload(values))
      // Full reset: the next open starts from the defaults, selections
      // included (the old partial reset deliberately left them behind).
      form.reset(defaultValues)
      onSuccess()
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  return (
    <FormProvider {...form}>
      <View className="gap-4">
        <AmountField />

        {kind === 'transfer' ? (
          <>
            <FromAccountField />
            <ToAccountField />
          </>
        ) : (
          <>
            <AccountField />
            <CategoryField type={kind} />
          </>
        )}

        <FormError testID="new-transaction-error">{form.formState.errors.root?.message}</FormError>

        <Button
          variant="primary"
          text="Сохранить"
          loading={form.formState.isSubmitting || createTransaction.isPending}
          disabled={createTransaction.isPending}
          onPress={form.handleSubmit(handleSubmit)}
          testID="new-transaction-submit"
        />

        {accounts.length === 0 ? (
          <View className="flex-row items-center gap-2">
            <Icon name="information-circle" size={16} colorClassName="accent-muted-foreground" />
            <Text variant="caption" className="flex-1 text-muted-foreground">
              Чтобы записать транзакцию, сначала создайте счёт
            </Text>
          </View>
        ) : null}
      </View>
    </FormProvider>
  )
}
