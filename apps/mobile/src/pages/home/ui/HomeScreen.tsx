import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { EmptyState, Screen, Text } from '@shared/ui'
import { useAccounts } from '@entities/account'
import { useCategories } from '@entities/category'
import { TransactionInput } from './TransactionInput'

/**
 * Home = the focused, non-scrolling add-transaction screen (Mibu-style minimal
 * layout). This component is a thin shell: it loads the reference data and picks
 * between the empty state and the form. All form logic - field state, zod
 * validation (which owns the save gate via `formState.isValid`), the optimistic
 * create, and serial-entry behavior - lives in {@link TransactionInput}.
 *
 * The form is gated on the accounts/categories queries resolving: that way its
 * `defaultValues` (last-used account / category / transfer pair) are correct at
 * mount, so there is no re-seeding effect and no per-field `useWatch`/`canSave`
 * derivation on the page. The recent-transactions list + balance header moved
 * off Home to the Transactions tab to satisfy the no-scroll constraint.
 */
export function HomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const accounts = accountsQuery.data
  const categories = categoriesQuery.data

  // Reference data loads async (SQLite / HTTP). Render nothing until it is in so
  // the form mounts with correct defaults (and we can tell "loading" apart from
  // "truly has no accounts", avoiding a false empty-state flash on cold start).
  if (!accounts || !categories) {
    return <Screen padded={false} />
  }

  if (accounts.length === 0) {
    return (
      <Screen padded={false}>
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<Text size="display">🏦</Text>}
            heading={t('accounts.homeEmptyAccountsTitle')}
            description={t('accounts.homeEmptyAccountsDescription')}
            actionLabel={t('accounts.homeEmptyAccountsAction')}
            onAction={() => router.navigate('/accounts')}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen padded={false}>
      <TransactionInput accounts={accounts} categories={categories} />
    </Screen>
  )
}
