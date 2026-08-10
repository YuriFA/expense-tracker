import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { type CurrencyCode } from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'
import { Screen, Text, ListRow, useTokens } from '@shared/ui'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { currencyOptions, LANGUAGE_OPTIONS } from '../model/options'
import { OptionPicker } from './OptionPicker'

type PickerKind = 'language' | 'currency' | null

/**
 * Settings screen (design.md section 7). Language and default currency are
 * selector rows that open a bottom-sheet picker (OptionPicker). Both are backed
 * by the persisted settings store and apply globally and immediately with NO
 * restart (design section 6/10):
 *   - language -> the store calls `i18next.changeLanguage`, react-i18next
 *     re-renders every translated surface (incl. localized default categories);
 *   - currency -> the default for new accounts, persisted for next launch.
 */
export function SettingsScreen() {
  const { t } = useTranslation()
  const tokens = useTokens()

  const locale = useSettingsStore((s) => s.locale)
  const currency = useSettingsStore((s) => s.currency)
  const setLocale = useSettingsStore((s) => s.setLocale)
  const setCurrency = useSettingsStore((s) => s.setCurrency)

  const [openPicker, setOpenPicker] = useState<PickerKind>(null)

  const currencyOpts = currencyOptions(locale)
  const selectedCurrencyLabel =
    currencyOpts.find((option) => option.value === currency)?.label ?? currency
  const selectedLanguageLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === locale)?.label ?? locale

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
  valueTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
})
