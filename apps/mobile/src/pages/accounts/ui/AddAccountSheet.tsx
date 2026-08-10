import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  AVAILABLE_CURRENCIES,
  type CurrencyCode,
} from '@expense-tracker/money'
import { type CreateAccountPayload, getRepositoryErrorMessage } from '@expense-tracker/api'
import {
  BottomSheet,
  Button,
  TextField,
  AmountField,
  FieldGroup,
  Text,
  SegmentedControl,
  type SegmentOption,
} from '@shared/ui'
import { useCreateAccount } from '@entities/account'
import { haptics } from '@shared/lib/haptics'
import { sanitizeAmountInput } from '@shared/lib/amount'
import { parseNonNegativeMinor } from '../model/balance'
import { accountRepositoryErrorMessages } from '../model/repository-errors'

interface AddAccountSheetProps {
  visible: boolean
  onClose: () => void
  /** Currency preselected for the new account (the user's default). */
  defaultCurrency: CurrencyCode
}

const currencyOptions: ReadonlyArray<SegmentOption<CurrencyCode>> = AVAILABLE_CURRENCIES.map(
  (code) => ({ value: code, label: code }),
)

/**
 * Create-account bottom sheet (design section 7: "Add button -> bottom-sheet
 * form"). Fields: name, currency (USD/EUR/RUB), opening balance. Owns its form
 * state and resets to defaults whenever it is opened. Currency is selectable
 * only at create time - the repository keeps it immutable afterwards, so the
 * edit sheet does not show it.
 */
export function AddAccountSheet({ visible, onClose, defaultCurrency }: AddAccountSheetProps) {
  const { t } = useTranslation()
  const createAccount = useCreateAccount()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency)
  const [opening, setOpening] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset to a clean form each time the sheet opens.
  useEffect(() => {
    if (!visible) return
    setName('')
    setCurrency(defaultCurrency)
    setOpening('')
    setError(null)
  }, [visible, defaultCurrency])

  // Empty opening balance is valid and means 0; a non-empty value must parse.
  const openingMinor =
    opening.trim() === '' ? 0 : parseNonNegativeMinor(opening)
  const openingValid = opening.trim() === '' || openingMinor !== null
  const canSubmit = name.trim().length > 0 && openingValid && !createAccount.isPending

  const handleSubmit = async () => {
    if (!canSubmit) return
    setError(null)
    const payload: CreateAccountPayload = {
      name: name.trim(),
      currency,
      openingBalance: openingMinor ?? 0,
    }
    try {
      await createAccount.mutateAsync(payload)
      haptics.notify('success')
      onClose()
    } catch (mutationError) {
      setError(getRepositoryErrorMessage(mutationError, accountRepositoryErrorMessages(t)))
      haptics.notify('warning')
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('addAccount.newAccount')}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <FieldGroup>
            <TextField
              label={t('addAccount.nameLabel')}
              placeholder={t('addAccount.namePlaceholder')}
              value={name}
              onChangeText={(text) => {
                setName(text)
                setError(null)
              }}
            />
            <View>
              <Text size="label" tone="muted" style={styles.fieldLabel}>
                {t('addAccount.currencyLabel')}
              </Text>
              <SegmentedControl
                options={currencyOptions}
                value={currency}
                onChange={setCurrency}
                accessibilityLabel={t('fields.currency')}
              />
            </View>
            <View>
              <Text size="label" tone="muted" style={styles.fieldLabel}>
                {t('addAccount.openingBalanceLabel')}
              </Text>
              {/* Canonical amount input: shows the live currency symbol for the
                  selected currency; opening balance is non-negative. */}
              <AmountField
                size="field"
                currency={currency}
                value={opening}
                placeholder="0"
                accessibilityLabel={t('addAccount.openingBalanceLabel')}
                onChangeText={(text) => {
                  setOpening(sanitizeAmountInput(text))
                  setError(null)
                }}
              />
            </View>
          </FieldGroup>
          {error ? (
            <Text size="caption" tone="destructive" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            full
            size="lg"
            loading={createAccount.isPending}
            disabled={!canSubmit}
            onPress={() => void handleSubmit()}
          >
            {t('addAccount.submit')}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 8,
    paddingBottom: 16,
  },
  fieldLabel: {
    marginBottom: 6,
  },
  error: {
    marginTop: 12,
  },
  footer: {
    paddingTop: 8,
  },
})
