import { useRef } from 'react'
import { View, type TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Button, EmptyState, Screen, Text, useTokens } from '@shared/ui'
import { useAccounts } from '@entities/account'
import { useCategories } from '@entities/category'
import { useTransactionForm } from '../model/use-transaction-form'
import { TransactionInput } from './TransactionInput'

/**
 * Home = the focused, non-scrolling add-transaction screen (Mibu-style minimal
 * layout). The hero amount is the visual centerpiece; a date carousel, type
 * switch, and account/category picker buttons all fit one viewport - with the
 * numeric keypad up - so the user can log an entry without scrolling. The Save
 * button is pinned in the thumb zone above the keyboard; after a save the amount
 * clears, the date resets to today, and focus returns to the hero field for
 * serial entry.
 *
 * The recent-transactions list moved off Home to the Transactions tab (the
 * canonical history surface); the balance header moved with it so the form has
 * room on small devices. This screen owns only the input flow + the empty-state
 * shown when there is no account yet.
 */
export function HomeScreen() {
  const { t } = useTranslation()
  const tokens = useTokens()
  const router = useRouter()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()

  const categories = categoriesQuery.data ?? []

  const form = useTransactionForm({
    accounts: accountsQuery.data,
    categories,
  })
  const amountRef = useRef<TextInput>(null)

  const handleSave = async () => {
    const ok = await form.save()
    if (ok) {
      // Serial entry: the form cleared the amount + reset the date; refocus.
      amountRef.current?.focus()
    }
  }

  const accounts = accountsQuery.data ?? []
  const noAccounts = accounts.length === 0
  const submitLabel =
    form.type === 'transfer' ? t('addTransfer.submit') : t('addTransaction.submit')

  return (
    <Screen padded={false}>
      {noAccounts ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<Text size="display">🏦</Text>}
            heading={t('accounts.homeEmptyAccountsTitle')}
            description={t('accounts.homeEmptyAccountsDescription')}
            actionLabel={t('accounts.homeEmptyAccountsAction')}
            onAction={() => router.navigate('/accounts')}
          />
        </View>
      ) : (
        <View className="flex-1 flex-col">
          <TransactionInput
            form={form}
            accounts={accounts}
            categories={categories}
            amountRef={amountRef}
          />

          <View
            className="px-4 pt-2 pb-2 gap-1.5"
            style={{ borderTopColor: tokens.border, borderTopWidth: 1 }}
          >
            {form.error ? (
              <Text size="caption" tone="destructive" style={{ textAlign: 'center' }}>
                {form.error}
              </Text>
            ) : null}
            <Button
              full
              size="lg"
              accessibilityLabel={submitLabel}
              disabled={!form.canSave || noAccounts}
              loading={form.isSaving}
              onPress={() => void handleSave()}
            >
              {submitLabel}
            </Button>
          </View>
        </View>
      )}
    </Screen>
  )
}
