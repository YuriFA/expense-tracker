// The speed-dial create-transaction sheet: one component, three flows
// (expense / income / transfer). Client-side guards mirror the API's domain
// rules - amount >= 1 minor unit, category type matches the flow, distinct
// transfer accounts of the same currency - and repository errors surface as
// RU messages through the shared error map.

import { useEffect, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import type { Category, CreateTransactionPayload } from '@expense-tracker/api'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetInput,
  BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'
import { useAccounts } from '@/entities/account/model/use-accounts'
import { useCategories } from '@/entities/category/model/use-categories'
import { useCreateTransaction } from '@/entities/transaction/model/use-transactions'

export type TransactionFlowKind = 'expense' | 'income' | 'transfer'

export interface NewTransactionSheetProps {
  ref: React.Ref<BottomSheetRef>
  kind: TransactionFlowKind
}

const KIND_TITLES: Record<TransactionFlowKind, string> = {
  expense: 'Новый расход',
  income: 'Новый доход',
  transfer: 'Новый перевод',
}

function OptionChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string
  selected: boolean
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cn(
        'rounded-xl border px-4 py-2.5',
        selected ? 'border-primary bg-secondary' : 'border-border',
      )}
      onPress={onPress}
    >
      <Text variant="body-sm" className={selected ? 'font-medium text-primary' : 'text-foreground'}>
        {label}
      </Text>
    </Pressable>
  )
}

export function NewTransactionSheet({ ref, kind }: NewTransactionSheetProps) {
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [fromAccountId, setFromAccountId] = useState<string | undefined>(undefined)
  const [toAccountId, setToAccountId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const createTransaction = useCreateTransaction()

  const accountsQuery = useAccounts()
  const accounts = accountsQuery.data ?? []
  const categoriesQuery = useCategories()
  const flowCategories = (categoriesQuery.data ?? []).filter((c) => c.type === kind)

  // Reset the form whenever a new flow opens from the speed dial.
  useEffect(() => {
    setAmount('')
    setAccountId(undefined)
    setCategoryId(undefined)
    setFromAccountId(undefined)
    setToAccountId(undefined)
    setError(undefined)
  }, [kind])

  const parsedAmount = parseMajorUnitsToMinor(amount)
  const amountValid = parsedAmount !== null && parsedAmount >= 1

  const fromAccount = accounts.find((account) => account.id === fromAccountId)
  const toCandidates = fromAccount
    ? accounts.filter(
        (account) => account.currency === fromAccount.currency && account.id !== fromAccount.id,
      )
    : []

  const canSubmit =
    amountValid &&
    !createTransaction.isPending &&
    (kind === 'transfer' ? Boolean(fromAccountId && toAccountId) : Boolean(accountId && categoryId))

  const submit = () => {
    if (!canSubmit || parsedAmount === null) return
    setError(undefined)

    const payload: CreateTransactionPayload =
      kind === 'transfer'
        ? {
            type: 'transfer',
            amount: parsedAmount,
            description: '',
            occurredAt: new Date().toISOString(),
            fromAccountId: fromAccountId as string,
            toAccountId: toAccountId as string,
          }
        : {
            type: kind,
            amount: parsedAmount,
            description: '',
            occurredAt: new Date().toISOString(),
            accountId: accountId as string,
            categoryId: categoryId as string,
          }

    createTransaction.mutate(payload, {
      onSuccess: () => {
        setAmount('')
        setError(undefined)
        // TODO(sheet-dismiss): see the matching TODO in
        // pages/accounts/ui/new-account-sheet.tsx - imperative dismiss after
        // a successful create needs investigation (Expo Go e2e).
        if (ref && typeof ref !== 'function') ref.current?.dismiss()
      },
      onError: (cause: unknown) => {
        setError(getRepositoryErrorText(cause))
      },
    })
  }

  return (
    <BottomSheet ref={ref} testID="new-transaction-sheet" snapPoints={['65%']}>
      <BottomSheetView testID="new-transaction-sheet">
        <BottomSheetHeader title={KIND_TITLES[kind]} />
        <BottomSheetBody className="gap-4">
          <BottomSheetInput
            label="Сумма"
            placeholder="0,00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            testID="new-transaction-amount"
          />

          {kind === 'transfer' ? (
            <>
              <View className="gap-2">
                <Text variant="label">Откуда</Text>
                <OptionRow
                  testIDPrefix="new-transaction-from"
                  options={accounts.map((account) => ({
                    id: account.id,
                    label: account.name,
                  }))}
                  selectedId={fromAccountId}
                  onSelect={setFromAccountId}
                />
              </View>
              <View className="gap-2">
                <Text variant="label">Куда</Text>
                {fromAccount ? (
                  <OptionRow
                    testIDPrefix="new-transaction-to"
                    options={toCandidates.map((account) => ({
                      id: account.id,
                      label: account.name,
                    }))}
                    selectedId={toAccountId}
                    onSelect={setToAccountId}
                  />
                ) : (
                  <Text variant="body-sm" className="text-muted-foreground">
                    Сначала выберите счёт списания
                  </Text>
                )}
              </View>
            </>
          ) : (
            <>
              <View className="gap-2">
                <Text variant="label">Счёт</Text>
                <OptionRow
                  testIDPrefix="new-transaction-account"
                  options={accounts.map((account) => ({ id: account.id, label: account.name }))}
                  selectedId={accountId}
                  onSelect={setAccountId}
                />
              </View>
              <View className="gap-2">
                <Text variant="label">Категория</Text>
                {flowCategories.length === 0 ? (
                  <Text variant="body-sm" className="text-muted-foreground">
                    Нет категорий этого типа - создайте категорию на главном экране
                  </Text>
                ) : (
                  <OptionRow
                    testIDPrefix="new-transaction-category"
                    options={flowCategories.map((category: Category) => ({
                      id: category.id,
                      label: category.name,
                    }))}
                    selectedId={categoryId}
                    onSelect={setCategoryId}
                  />
                )}
              </View>
            </>
          )}

          {error ? (
            <Text variant="caption" className="text-destructive" testID="new-transaction-error">
              {error}
            </Text>
          ) : null}

          <Button
            variant="primary"
            text="Сохранить"
            disabled={!canSubmit}
            loading={createTransaction.isPending}
            onPress={submit}
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
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}

function OptionRow({
  options,
  selectedId,
  onSelect,
  testIDPrefix,
}: {
  options: { id: string; label: string }[]
  selectedId: string | undefined
  onSelect: (id: string) => void
  testIDPrefix: string
}) {
  return (
    <ScrollView
      horizontal
      testID={`${testIDPrefix}-list`}
      contentContainerStyle={{ gap: 8 }}
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => (
        <OptionChip
          key={option.id}
          testID={`${testIDPrefix}-${option.id}`}
          label={option.label}
          selected={selectedId === option.id}
          onPress={() => onSelect(option.id)}
        />
      ))}
    </ScrollView>
  )
}
