import { useRef, useState } from 'react'
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  type TextInput,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Screen, Button, Text, EmptyState, useTokens } from '@shared/ui'
import { useAccounts } from '@entities/account'
import { useCategories } from '@entities/category'
import type { Transaction } from '@expense-tracker/api'
import { useTransactionForm } from '../model/use-transaction-form'
import { HomeHeader } from './HomeHeader'
import { TransactionInput } from './TransactionInput'
import { RecentTransactions } from './RecentTransactions'
import { TransactionEditSheet } from '@features/transaction/edit'

/**
 * Home = the input screen (design section 3/7). On open the hero amount field
 * is focused and the numeric keypad is up; the type switch, account chips,
 * category grid, and optional comment are within thumb reach; the full-width
 * Save button is pinned in the lower thumb zone and stays visible above the
 * keyboard. After a save the amount clears and focus returns to it - serial
 * entry for logging several transactions in a row - while account/category/type
 * persist. The recent list beneath the form updates optimistically.
 */
export function HomeScreen() {
  const { t } = useTranslation()
  const tokens = useTokens()
  const router = useRouter()
  const queryClient = useQueryClient()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()

  // Raw categories; the grid localizes seed names via `mapCategories` itself.
  const categories = categoriesQuery.data ?? []

  const form = useTransactionForm({
    accounts: accountsQuery.data,
    categories,
  })
  const amountRef = useRef<TextInput>(null)

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleSave = async () => {
    const ok = await form.save()
    if (ok) {
      // Serial entry: the form cleared the amount; refocus the hero field.
      amountRef.current?.focus()
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    ])
    setRefreshing(false)
  }

  const accounts = accountsQuery.data ?? []
  const noAccounts = accounts.length === 0
  const submitLabel =
    form.type === 'transfer' ? t('addTransfer.submit') : t('addTransaction.submit')

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={tokens.mutedForeground}
            colors={[tokens.mutedForeground]}
          />
        }
      >
        <HomeHeader />
        {noAccounts ? (
          <EmptyState
            icon={<Text size="display">🏦</Text>}
            heading={t('accounts.homeEmptyAccountsTitle')}
            description={t('accounts.homeEmptyAccountsDescription')}
            actionLabel={t('accounts.homeEmptyAccountsAction')}
            onAction={() => router.navigate('/accounts')}
          />
        ) : (
          <TransactionInput
            form={form}
            accounts={accounts}
            categories={categories}
            amountRef={amountRef}
          />
        )}
        <RecentTransactions onEditTransaction={setEditingTransaction} />
      </ScrollView>

      <View style={[styles.saveBar, { borderTopColor: tokens.border }]}>
        {form.error ? (
          <Text size="caption" tone="destructive" style={styles.saveError}>
            {form.error}
          </Text>
        ) : null}
        <Button
          full
          size="lg"
          disabled={!form.canSave || noAccounts}
          loading={form.isSaving}
          onPress={() => void handleSave()}
        >
          {submitLabel}
        </Button>
      </View>

      {editingTransaction ? (
        <TransactionEditSheet
          transaction={editingTransaction}
          visible={Boolean(editingTransaction)}
          onClose={() => setEditingTransaction(null)}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 20,
  },
  saveBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  saveError: {},
})
