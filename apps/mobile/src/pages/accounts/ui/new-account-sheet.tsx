// Create-account bottom-sheet form: name, currency (USD/EUR/RUB), and the
// opening balance entered in MAJOR units and converted to integer minor
// units via the shared money helpers (never float arithmetic on stored
// values; the single x100 rounding happens at the boundary).

import { useState } from 'react'
import { View } from 'react-native'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import { AVAILABLE_CURRENCIES, type CurrencyCode } from '@expense-tracker/money'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetInput,
  BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { Text } from '@/shared/ui/text'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'
import { useCreateAccount } from '@/entities/account/model/use-accounts'

export interface NewAccountSheetProps {
  ref: React.Ref<BottomSheetRef>
}

export function NewAccountSheet({ ref }: NewAccountSheetProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('RUB')
  const [openingBalance, setOpeningBalance] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const createAccount = useCreateAccount()

  const parsedBalance = parseMajorUnitsToMinor(openingBalance)
  const nameValid = Boolean(name.trim())

  const reset = () => {
    setName('')
    setCurrency('RUB')
    setOpeningBalance('')
    setError(undefined)
  }

  const submit = () => {
    if (!nameValid || parsedBalance === null || createAccount.isPending) return
    setError(undefined)
    createAccount.mutate(
      { name: name.trim(), currency, openingBalance: parsedBalance },
      {
        onSuccess: () => {
          reset()
          // TODO(sheet-dismiss): the imperative dismiss after a successful
          // create was observed NOT closing the sheet in the Expo Go e2e run
          // (reset clearly ran). Investigate the @gorhom BottomSheetModal
          // dismiss timing (likely keyboard-dismiss interplay); e2e flows
          // close via backdrop tap meanwhile.
          if (ref && typeof ref !== 'function') ref.current?.dismiss()
        },
        onError: (cause: unknown) => {
          setError(getRepositoryErrorText(cause))
        },
      },
    )
  }

  return (
    <BottomSheet ref={ref} testID="accounts-new-sheet" snapPoints={['75%']}>
      <BottomSheetView testID="accounts-new-sheet">
        <BottomSheetHeader title="Новый счёт" />
        <BottomSheetBody className="gap-4">
          <FormField>
            <FormLabel className={error ? 'text-destructive' : undefined}>Название</FormLabel>
            <BottomSheetInput
              placeholder="Например, Карта"
              value={name}
              onChangeText={setName}
              invalid={Boolean(error)}
              testID="accounts-create-name"
            />
            <FormError testID="accounts-create-error">{error}</FormError>
          </FormField>

          <View className="gap-2">
            <Text variant="label">Валюта</Text>
            <View className="flex-row gap-2" testID="accounts-create-currencies">
              {AVAILABLE_CURRENCIES.map((code) => (
                <Button
                  key={code}
                  variant={currency === code ? 'primary' : 'outline'}
                  text={code}
                  className="flex-1"
                  onPress={() => setCurrency(code)}
                  testID={`accounts-create-currency-${code}`}
                />
              ))}
            </View>
          </View>

          <FormField>
            <FormLabel>Начальный баланс</FormLabel>
            <BottomSheetInput
              placeholder="0,00"
              value={openingBalance}
              onChangeText={setOpeningBalance}
              keyboardType="decimal-pad"
              testID="accounts-create-opening-balance"
            />
          </FormField>

          <Button
            variant="primary"
            text="Создать"
            disabled={!nameValid || parsedBalance === null}
            loading={createAccount.isPending}
            onPress={submit}
            testID="accounts-create-submit"
          />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}
