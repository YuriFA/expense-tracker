import { useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import {
  type AccountWithBalance,
  type UpdateAccountPayload,
  getRepositoryErrorMessage,
} from '@expense-tracker/api'
import { BottomSheet, Button, TextField, FieldGroup, Text } from '@shared/ui'
import { useUpdateAccount } from '@entities/account'
import { haptics } from '@shared/lib/haptics'
import { editAccountSchema, type EditAccountValues } from '../model/form-schema'
import { minorToSignedText, parseSignedMinor, sanitizeSignedAmount } from '../model/balance'
import { accountRepositoryErrorMessages } from '../model/repository-errors'

interface EditAccountSheetProps {
  account: AccountWithBalance
  visible: boolean
  onClose: () => void
  /** User tapped "Delete account"; the screen opens the confirm sheet. */
  onRequestDelete: (account: AccountWithBalance) => void
}

/**
 * Edit-account bottom sheet (design section 7: "Tap card -> edit (name,
 * balance correction)"). Currency is immutable after create (the repository
 * ignores it on update and the field is omitted here).
 *
 * The balance field is a *set-to* correction: it is prefilled with the account's
 * current computed balance and the user sets the value it should read. On save
 * the required `manualAdjustment` delta is back-computed (`current adjustment +
 * (desired - current balance)`), so the stored model is unchanged while the
 * input stays intuitive ("make my balance be X").
 *
 * Field state + validation are owned by react-hook-form (+ zod resolver that
 * parses the signed balance to minor units); submit is enabled only when the
 * form is both valid and dirty (an actual change) and not mid-mutation.
 */
export function EditAccountSheet({
  account,
  visible,
  onClose,
  onRequestDelete,
}: EditAccountSheetProps) {
  const { t } = useTranslation()
  const updateAccount = useUpdateAccount()

  const defaults: EditAccountValues = {
    name: account.name,
    balance: minorToSignedText(account.balance),
  }
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, isDirty },
  } = useForm<EditAccountValues>({
    resolver: zodResolver(editAccountSchema(t)),
    mode: 'onChange',
    defaultValues: defaults,
  })

  const [error, setError] = useState<string | null>(null)

  // Seed from the account every time the sheet opens.
  useEffect(() => {
    if (!visible) return
    reset({ name: account.name, balance: minorToSignedText(account.balance) })
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, account.id, account.name, account.balance])

  const submitting = updateAccount.isPending
  const canSubmit = isValid && isDirty && !submitting

  const onSubmit = async (values: EditAccountValues) => {
    setError(null)
    // Back out the adjustment delta from the desired balance vs. current.
    const balanceMinor = parseSignedMinor(values.balance) ?? 0
    const manualAdjustment = account.manualAdjustment + (balanceMinor - account.balance)
    const payload: UpdateAccountPayload = { name: values.name, manualAdjustment }
    try {
      await updateAccount.mutateAsync({ id: account.id, payload })
      haptics.notify('success')
      onClose()
    } catch (mutationError) {
      setError(getRepositoryErrorMessage(mutationError, accountRepositoryErrorMessages(t)))
      haptics.notify('warning')
    }
  }

  const clearError = () => setError(null)

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('editAccount.title')}>
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
                  label={t('editAccount.nameLabel')}
                  placeholder={t('editAccount.namePlaceholder')}
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
              <Controller
                control={control}
                name="balance"
                render={({ field: { value, onChange }, fieldState: { error: fieldError } }) => (
                  <TextField
                    label={t('editAccount.openingBalanceLabel')}
                    value={value}
                    onChangeText={(text) => {
                      onChange(sanitizeSignedAmount(text))
                      clearError()
                    }}
                    error={fieldError?.message ?? null}
                    // A balance can be negative (overdraft), so the keypad must
                    // offer a minus sign; `numbers-and-punctuation` does on iOS.
                    keyboardType="numbers-and-punctuation"
                  />
                )}
              />
              <Text size="caption" tone="muted" style={styles.currencyHint}>
                {account.currency}
              </Text>
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
            {t('editAccount.submit')}
          </Button>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('deleteAccount.trigger')}
            onPress={() => onRequestDelete(account)}
            style={({ pressed }) => [styles.deleteRow, pressed && { opacity: 0.6 }]}
          >
            <Text size="body" weight={500} tone="destructive">
              {t('deleteAccount.trigger')}
            </Text>
          </Pressable>
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
  currencyHint: {
    marginTop: 6,
  },
  error: {
    marginTop: 12,
  },
  footer: {
    paddingTop: 8,
  },
  deleteRow: {
    minHeight: 44,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
