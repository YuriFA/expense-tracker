import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import {
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import type { AccountWithBalance } from '@expense-tracker/api'
import { useAccounts } from '@entities/account'
import {
  Screen,
  Text,
  EmptyState,
  ErrorState,
  Skeleton,
  useTokens,
} from '@shared/ui'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { groupAccountsByCurrency } from '../model/grouping'
import { AccountGroup } from './AccountGroup'
import { AddAccountSheet } from './AddAccountSheet'
import { EditAccountSheet } from './EditAccountSheet'
import { ConfirmDeleteSheet } from './ConfirmDeleteSheet'

/**
 * Accounts screen (design section 7). Account cards with balances grouped by
 * currency, each group carrying a per-currency total; add via the header button
 * -> bottom sheet; tap a card -> edit (name + balance correction); delete via a
 * confirmation sheet. Offline-first via the local-persistence repository +
 * TanStack Query. Loading/empty/error use the canonical state vocabulary.
 */
export function AccountsScreen() {
  const { t } = useTranslation()
  const tokens = useTokens()
  const locale = useSettingsStore((state) => state.locale)
  const defaultCurrency = useSettingsStore((state) => state.currency)
  const { data: accounts, isLoading, isError, refetch } = useAccounts()

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<AccountWithBalance | null>(null)
  const [deleting, setDeleting] = useState<AccountWithBalance | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const groups = useMemo(() => groupAccountsByCurrency(accounts ?? []), [accounts])

  const openAdd = useCallback(() => setAddOpen(true), [])

  // Header "+" button (design: "Add button (in header)"). Always available so
  // the user can add even from the empty state.
  const navigation = useNavigation()
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderAddButton onPress={openAdd} label={t('addAccount.newAccount')} />
      ),
    })
  }, [navigation, openAdd, t])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const requestDelete = useCallback((account: AccountWithBalance) => {
    // Close the edit sheet, then open the confirmation (never stack two sheets).
    setEditing(null)
    setDeleting(account)
  }, [])

  let body: ReactNode
  if (isLoading) {
    body = <AccountsSkeleton />
  } else if (isError) {
    body = (
      <Screen centered>
        <ErrorState onRetry={() => void refetch()} />
      </Screen>
    )
  } else if (!accounts || accounts.length === 0) {
    body = (
      <Screen centered>
        <EmptyState
          icon={<Text size="display">🏦</Text>}
          heading={t('accounts.noAccounts')}
          description={t('accounts.noAccountsDescription')}
          actionLabel={t('addAccount.submit')}
          onAction={openAdd}
        />
      </Screen>
    )
  } else {
    body = (
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={tokens.mutedForeground}
              colors={[tokens.mutedForeground]}
            />
          }
        >
          {groups.map((group) => (
            <AccountGroup
              key={group.currency}
              group={group}
              locale={locale}
              onAccountPress={setEditing}
            />
          ))}
        </ScrollView>
      </Screen>
    )
  }

  return (
    <>
      {body}
      <AddAccountSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        defaultCurrency={defaultCurrency}
      />
      {editing ? (
        <EditAccountSheet
          account={editing}
          visible
          onClose={() => setEditing(null)}
          onRequestDelete={requestDelete}
        />
      ) : null}
      {deleting ? (
        <ConfirmDeleteSheet
          account={deleting}
          visible
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  )
}

interface HeaderAddButtonProps {
  onPress: () => void
  label: string
}

function HeaderAddButton({ onPress, label }: HeaderAddButtonProps) {
  const tokens = useTokens()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name="add" size={28} color={tokens.ink} />
    </Pressable>
  )
}

/** Loading vocabulary (design section 9): skeletons, not centered spinners. */
function AccountsSkeleton() {
  return (
    <Screen padded={false}>
      <View style={styles.skeletonList}>
        {[0, 1].map((section) => (
          <View key={section} style={styles.skeletonSection}>
            <View style={styles.skeletonHeader}>
              <Skeleton width={48} height={16} />
              <Skeleton width={96} height={20} />
            </View>
            <View style={styles.skeletonCard}>
              {[0, 1].map((row) => (
                <View key={row} style={styles.skeletonRow}>
                  <Skeleton width={36} height={36} radius={10} />
                  <View style={styles.skeletonRowText}>
                    <Skeleton width={120} height={16} />
                  </View>
                  <Skeleton width={72} height={16} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 24,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonList: {
    padding: 16,
    gap: 24,
  },
  skeletonSection: {
    gap: 8,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  skeletonCard: {
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonRowText: {
    flex: 1,
  },
})
