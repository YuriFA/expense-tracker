import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  AVAILABLE_CURRENCIES,
  type CurrencyCode,
} from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'
import {
  Screen,
  Text,
  SegmentedControl,
  type SegmentOption,
} from '@shared/ui'
import {
  useSettingsStore,
} from '@shared/store/use-settings-store'
import type { ThemePreference } from '@shared/config/settings'
import { APP_DISPLAY_NAME } from '@shared/config/app'

/**
 * Settings screen. Language / default currency / theme are real controls
 * backed by the persisted settings store: changing any of them applies
 * globally and immediately (i18n switches the active bundle, theme resolves
 * against the OS scheme) without restart - the mobile design's hard contract.
 */
export function SettingsScreen() {
  const { t } = useTranslation()
  const locale = useSettingsStore((s) => s.locale)
  const currency = useSettingsStore((s) => s.currency)
  const theme = useSettingsStore((s) => s.theme)
  const setLocale = useSettingsStore((s) => s.setLocale)
  const setCurrency = useSettingsStore((s) => s.setCurrency)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const localeOptions: ReadonlyArray<SegmentOption<AppLocale>> = [
    { value: 'en', label: 'EN' },
    { value: 'ru', label: 'RU' },
  ]
  const currencyOptions: ReadonlyArray<SegmentOption<CurrencyCode>> = AVAILABLE_CURRENCIES.map(
    (code) => ({ value: code, label: code }),
  )
  const themeOptions: ReadonlyArray<SegmentOption<ThemePreference>> = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  return (
    <Screen scrollable>
      <View style={styles.section}>
        <Text size="title" weight={600}>
          {APP_DISPLAY_NAME}
        </Text>
      </View>

      <SettingRow label={t('settings.locale')}>
        <SegmentedControl
          options={localeOptions}
          value={locale}
          onChange={setLocale}
          accessibilityLabel={t('settings.locale')}
        />
      </SettingRow>

      <SettingRow label={t('settings.currency')}>
        <SegmentedControl
          options={currencyOptions}
          value={currency}
          onChange={setCurrency}
          accessibilityLabel={t('settings.currency')}
        />
      </SettingRow>

      <SettingRow label={t('settings.theme')}>
        <SegmentedControl
          options={themeOptions}
          value={theme}
          onChange={setTheme}
          accessibilityLabel={t('settings.theme')}
        />
      </SettingRow>
    </Screen>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text size="label" tone="muted" style={{ marginBottom: 8 }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
})
