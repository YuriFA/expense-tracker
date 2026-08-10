import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useTranslation } from 'react-i18next'
import { type CurrencyCode } from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'
import {
  Screen,
  Text,
  ListRow,
  SegmentedControl,
  type SegmentOption,
  useTokens,
} from '@shared/ui'
import { useSettingsStore } from '@shared/store/use-settings-store'
import type { ThemePreference } from '@shared/config/settings'
import { currencyOptions, LANGUAGE_OPTIONS } from '../model/options'
import { OptionPicker } from './OptionPicker'
import { CategoryManageSheet } from '../features/category-manage'

type PickerKind = 'language' | 'currency' | null

/**
 * Settings screen (design.md section 7). Three knobs the design lists -
 * language, default currency, theme - plus an optional version row.
 *
 * All three are backed by the persisted settings store and apply globally and
 * immediately with NO restart (the hard contract from design section 6/10):
 *   - language -> the store calls `i18next.changeLanguage`, react-i18next
 *     re-renders every translated surface (incl. localized default categories);
 *   - theme -> the ThemeProvider resolves the new preference against the OS
 *     scheme and swaps the token map live;
 *   - currency -> the default for new accounts, persisted for next launch.
 *
 * Language and currency are selector rows that open a bottom-sheet picker
 * (OptionPicker); theme is an inline segmented control (system / light / dark),
 * matching the design's inline three-way toggle for quick light/dark previews.
 */
export function SettingsScreen() {
  const { t } = useTranslation()
  const tokens = useTokens()

  const locale = useSettingsStore((s) => s.locale)
  const currency = useSettingsStore((s) => s.currency)
  const theme = useSettingsStore((s) => s.theme)
  const setLocale = useSettingsStore((s) => s.setLocale)
  const setCurrency = useSettingsStore((s) => s.setCurrency)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const [openPicker, setOpenPicker] = useState<PickerKind>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const themeOptions: ReadonlyArray<SegmentOption<ThemePreference>> = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
  ]

  const currencyOpts = currencyOptions(locale)
  const selectedCurrencyLabel =
    currencyOpts.find((option) => option.value === currency)?.label ?? currency
  const selectedLanguageLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === locale)?.label ?? locale

  const appVersion = Constants.expoConfig?.version ?? '0.0.0'

  return (
    <Screen scrollable>
      <View style={styles.stack}>
        <SettingsGroup>
          <ListRow
            onPress={() => setOpenPicker('language')}
            divider
            trailing={
              <View style={styles.valueTrailing}>
                <Text size="body" tone="muted">
                  {selectedLanguageLabel}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={tokens.mutedForeground} />
              </View>
            }
          >
            <Text size="body">{t('settings.language')}</Text>
          </ListRow>

          <ListRow
            onPress={() => setOpenPicker('currency')}
            divider={false}
            trailing={
              <View style={styles.valueTrailing}>
                <Text size="body" tone="muted">
                  {selectedCurrencyLabel}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={tokens.mutedForeground} />
              </View>
            }
          >
            <Text size="body">{t('settings.defaultCurrency')}</Text>
          </ListRow>
        </SettingsGroup>

        <SettingsGroup>
          <ListRow
            onPress={() => setCategoriesOpen(true)}
            divider={false}
            trailing={
              <View style={styles.valueTrailing}>
                <Ionicons name="chevron-forward" size={16} color={tokens.mutedForeground} />
              </View>
            }
          >
            <Text size="body">{t('settings.categories')}</Text>
          </ListRow>
        </SettingsGroup>

        <SettingsGroup>
          <View style={styles.themeBlock}>
            <Text size="body">{t('settings.theme')}</Text>
            <SegmentedControl
              options={themeOptions}
              value={theme}
              onChange={setTheme}
              accessibilityLabel={t('settings.theme')}
            />
          </View>
        </SettingsGroup>

        <SettingsGroup>
          <ListRow
            divider={false}
            trailing={
              <Text size="body" tone="muted">
                {appVersion}
              </Text>
            }
          >
            <Text size="body">{t('settings.version')}</Text>
          </ListRow>
        </SettingsGroup>
      </View>

      <OptionPicker<AppLocale>
        visible={openPicker === 'language'}
        onClose={() => setOpenPicker(null)}
        title={t('settings.language')}
        options={LANGUAGE_OPTIONS}
        selectedValue={locale}
        onSelect={setLocale}
      />
      <OptionPicker<CurrencyCode>
        visible={openPicker === 'currency'}
        onClose={() => setOpenPicker(null)}
        title={t('settings.defaultCurrency')}
        options={currencyOpts}
        selectedValue={currency}
        onSelect={setCurrency}
      />
      <CategoryManageSheet visible={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </Screen>
  )
}

/**
 * Inset grouped card - the iOS-Settings surface for a cluster of related rows.
 * A hairline border defines the group in light mode (where surface == background),
 * rounded corners + overflow clip give the grouped-list look.
 */
function SettingsGroup({ children }: { children: React.ReactNode }) {
  const tokens = useTokens()
  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 20,
  },
  group: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  themeBlock: {
    padding: 16,
    gap: 12,
  },
  valueTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
})
