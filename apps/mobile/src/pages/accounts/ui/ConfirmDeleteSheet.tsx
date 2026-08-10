import { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  type AccountWithBalance,
  getRepositoryErrorMessage,
} from '@expense-tracker/api'
import { BottomSheet, Button, Text } from '@shared/ui'
import { useDeleteAccount } from '@entities/account'
import { haptics } from '@shared/lib/haptics'
import { accountRepositoryErrorMessages } from '../model/repository-errors'

interface ConfirmDeleteSheetProps {
  account: AccountWithBalance
  visible: boolean
  onClose: () => void
}

/**
 * Delete-account confirmation (design section 6/7: "delete with confirmation").
 * A bottom sheet (not an alert) so the destructive action can show a loading
 * state and surface a "linked transactions" failure inline - the repository
 * rejects the delete with `ReferentialIntegrityError` when the account is in use.
 */
export function ConfirmDeleteSheet({ account, visible, onClose }: ConfirmDeleteSheetProps) {
  const { t } = useTranslation()
  const deleteAccount = useDeleteAccount()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) setError(null)
  }, [visible])

  const handleConfirm = async () => {
    setError(null)
    try {
      await deleteAccount.mutateAsync(account.id)
      haptics.notify('success')
      onClose()
    } catch (mutationError) {
      setError(getRepositoryErrorMessage(mutationError, accountRepositoryErrorMessages(t)))
      haptics.notify('warning')
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('deleteAccount.trigger')} heightRatio={0.42}>
      <View style={styles.body}>
        <View style={styles.message}>
          <Text size="body" weight={600}>
            {t('deleteAccount.confirmDelete')}
          </Text>
          <Text size="body" tone="muted">
            {t('deleteAccount.confirmDeleteDescription')}
          </Text>
          <Text size="caption" tone="muted" style={styles.target}>
            {account.name} · {account.currency}
          </Text>
        </View>

        {error ? (
          <Text size="caption" tone="destructive" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button variant="ghost" onPress={onClose} style={styles.flex}>
          {t('deleteAccount.cancel')}
        </Button>
        <Button
          variant="destructive"
          loading={deleteAccount.isPending}
          onPress={() => void handleConfirm()}
          style={styles.flex}
        >
          {t('deleteAccount.confirm')}
        </Button>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  message: {
    gap: 8,
  },
  target: {
    marginTop: 4,
  },
  error: {
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  flex: {
    flex: 1,
  },
})
