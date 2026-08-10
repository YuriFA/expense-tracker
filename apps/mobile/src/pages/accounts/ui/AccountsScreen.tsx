import { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  AVAILABLE_CURRENCIES,
  type CurrencyCode,
} from '@expense-tracker/money'
import { useAccounts, useCreateAccount } from '@entities/account'
import {
  Screen,
  ListRow,
  EmptyState,
  ErrorState,
  Skeleton,
  Text,
  Button,
  TextField,
  FieldGroup,
  BottomSheet,
  SegmentedControl,
  type SegmentOption,
} from '@shared/ui'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { formatAmount } from '@shared/lib/format'

/**
 * Accounts screen. The full grouping-by-currency + balances + edit/delete UX is
 * a later task; this shell wires the offline create→read round-trip end to end:
 * an empty list offers an "Add account" sheet that writes through the local
 * repository (TanStack mutation), and the list reflects it instantly.
 */
export function AccountsScreen() {
  const { t } = useTranslation()
  const { data: accounts, isLoading, isError, refetch } = useAccounts()
  const createAccount = useCreateAccount()
  const locale = useSettingsStore((s) => s.locale)
  const defaultCurrency = useSettingsStore((s) => s.currency)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency)
  const [opening, setOpening] = useState('')

  const currencyOptions: ReadonlyArray<SegmentOption<CurrencyCode>> = AVAILABLE_CURRENCIES.map(
    (code) => ({ value: code, label: code }),
  )

  const resetForm = () => {
    setName('')
    setCurrency(defaultCurrency)
    setOpening('')
  }

  const closeSheet = () => {
    setSheetOpen(false)
    resetForm()
  }

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    // UI major-units string -> integer minor units (the storage model).
    const major = Number.parseFloat(opening) || 0
    const openingMinor = Math.round(major * 100)

    createAccount.mutate(
      { name: trimmed, currency, openingBalance: openingMinor },
      {
        onSettled: closeSheet,
      },
    )
  }

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.skeleton}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={56} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </Screen>
    )
  }

  if (isError) {
    return (
      <Screen centered>
        <ErrorState onRetry={() => void refetch()} />
      </Screen>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <>
        <Screen centered>
          <EmptyState
            icon={<Text size="display">🏦</Text>}
            heading={t('accounts.noAccounts')}
            description={t('accounts.noAccountsDescription')}
            actionLabel={t('addAccount.submit')}
            onAction={() => setSheetOpen(true)}
          />
        </Screen>
        <CreateAccountSheet
          visible={sheetOpen}
          onClose={closeSheet}
          name={name}
          currency={currency}
          currencyOptions={currencyOptions}
          opening={opening}
          onName={setName}
          onCurrency={setCurrency}
          onOpening={setOpening}
          submitting={createAccount.isPending}
          onSubmit={handleSubmit}
        />
      </>
    )
  }

  return (
    <>
      <Screen padded={false}>
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text size="title" weight={600}>
                {t('accounts.totalBalance')}
              </Text>
              <Button size="md" variant="outline" onPress={() => setSheetOpen(true)}>
                {t('addAccount.submit')}
              </Button>
            </View>
          }
          onRefresh={() => void refetch()}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <ListRow
              leading={<Text size="title">{item.currency[0]}</Text>}
              trailing={
                <Text size="body" weight={600} tabular>
                  {formatAmount(item.balance, item.currency, locale)}
                </Text>
              }
            >
              <Text size="body" weight={500}>
                {item.name}
              </Text>
              <Text size="caption" tone="muted">
                {item.currency}
              </Text>
            </ListRow>
          )}
        />
      </Screen>
      <CreateAccountSheet
        visible={sheetOpen}
        onClose={closeSheet}
        name={name}
        currency={currency}
        currencyOptions={currencyOptions}
        opening={opening}
        onName={setName}
        onCurrency={setCurrency}
        onOpening={setOpening}
        submitting={createAccount.isPending}
        onSubmit={handleSubmit}
      />
    </>
  )
}

interface CreateAccountSheetProps {
  visible: boolean
  onClose: () => void
  name: string
  currency: CurrencyCode
  currencyOptions: ReadonlyArray<SegmentOption<CurrencyCode>>
  opening: string
  onName: (v: string) => void
  onCurrency: (v: CurrencyCode) => void
  onOpening: (v: string) => void
  submitting: boolean
  onSubmit: () => void
}

function CreateAccountSheet({
  visible,
  onClose,
  name,
  currency,
  currencyOptions,
  opening,
  onName,
  onCurrency,
  onOpening,
  submitting,
  onSubmit,
}: CreateAccountSheetProps) {
  const { t } = useTranslation()
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('addAccount.newAccount')}>
      <FieldGroup>
        <TextField
          label={t('addAccount.nameLabel')}
          placeholder={t('addAccount.namePlaceholder')}
          value={name}
          onChangeText={onName}
        />
        <View>
          <Text size="label" tone="muted" style={{ marginBottom: 6 }}>
            {t('addAccount.currencyLabel')}
          </Text>
          <SegmentedControl
            options={currencyOptions}
            value={currency}
            onChange={onCurrency}
            accessibilityLabel={t('fields.currency')}
          />
        </View>
        <TextField
          label={t('addAccount.openingBalanceLabel')}
          placeholder="0"
          value={opening}
          onChangeText={onOpening}
          keyboardType="numeric"
        />
      </FieldGroup>
      <View style={{ flex: 1 }} />
      <Button full size="lg" loading={submitting} disabled={!name.trim()} onPress={onSubmit}>
        {t('addAccount.submit')}
      </Button>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  skeleton: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
})
