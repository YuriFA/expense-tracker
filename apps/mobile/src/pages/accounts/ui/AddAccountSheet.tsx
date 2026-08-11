import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { AVAILABLE_CURRENCIES, type CurrencyCode } from '@expense-tracker/money'
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
import { createAccountSchema, type CreateAccountValues } from '../model/form-schema'
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
 * form"). Fields: name, currency (USD/EUR/RUB), opening balance. The field
 * state + validation are owned by react-hook-form (+ a zod resolver that parses
 * the amount to minor units on submit); the form resets to defaults whenever
 * the sheet opens. Currency is selectable only at create time - the repository
 * keeps it immutable afterwards, so the edit sheet does not show it.
 *
 * Submit stays disabled until the form is valid (non-empty name + a parseable
 * non-negative opening balance); a repository error from a failed create is
 * surfaced inline and cleared on the next field edit.
 */
export function AddAccountSheet({ visible, onClose, defaultCurrency }: AddAccountSheetProps) {
  const { t } = useTranslation()
  const createAccount = useCreateAccount()

  const defaults: CreateAccountValues = { name: '', currency: defaultCurrency, opening: '' }
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema(t)),
    mode: 'onChange',
    defaultValues: defaults,
  })
  // Live currency drives the AmountField's symbol; watching avoids re-rendering
  // the whole form when only the opening text changes.
  const currency = useWatch({ control, name: 'currency' }) ?? defaultCurrency

  const [error, setError] = useState<string | null>(null)

  // Reset to a clean form each time the sheet opens.
  useEffect(() => {
    if (!visible) return
    reset({ name: '', currency: defaultCurrency, opening: '' })
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, defaultCurrency])

  const submitting = createAccount.isPending
  const canSubmit = isValid && !submitting

  const onSubmit = async (values: CreateAccountValues) => {
    setError(null)
    const openingBalance =
      values.opening.trim() === '' ? 0 : (parseNonNegativeMinor(values.opening) ?? 0)
    const payload: CreateAccountPayload = {
      name: values.name,
      currency: values.currency,
      openingBalance,
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

  // Clear the repository error as soon as the user edits any field, matching
  // the pre-migration UX (the error is stale once the input changes).
  const clearError = () => setError(null)

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
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
                <TextField
                  label={t('addAccount.nameLabel')}
                  placeholder={t('addAccount.namePlaceholder')}
                  value={value}
                  onChangeText={(text) => {
                    onChange(text)
                    clearError()
                  }}
                  error={fieldError?.message ?? null}
                />
              )}
            />
            <View>
              <Text size="label" tone="muted" style={styles.fieldLabel}>
                {t('addAccount.currencyLabel')}
              </Text>
              <Controller
                control={control}
                name="currency"
                render={({ field: { value, onChange } }) => (
                  <SegmentedControl
                    options={currencyOptions}
                    value={value}
                    onChange={(next) => {
                      onChange(next)
                      clearError()
                    }}
                    accessibilityLabel={t('fields.currency')}
                  />
                )}
              />
            </View>
            <View>
              <Text size="label" tone="muted" style={styles.fieldLabel}>
                {t('addAccount.openingBalanceLabel')}
              </Text>
              {/* Canonical amount input: shows the live currency symbol for the
                  selected currency; opening balance is non-negative. */}
              <Controller
                control={control}
                name="opening"
                render={({ field: { value, onChange } }) => (
                  <AmountField
                    size="field"
                    currency={currency}
                    value={value}
                    placeholder="0"
                    accessibilityLabel={t('addAccount.openingBalanceLabel')}
                    onChangeText={(text) => {
                      onChange(sanitizeAmountInput(text))
                      clearError()
                    }}
                  />
                )}
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
            loading={submitting}
            disabled={!canSubmit}
            onPress={() => void handleSubmit(onSubmit)()}
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
