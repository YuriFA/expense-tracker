import { forwardRef } from 'react'
import { TextInput, View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { CurrencyCode } from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'
import { currencySymbol, currencyName } from '@shared/lib/format'
import { useTokens } from './theme'
import { Text } from './Text'

export type AmountFieldSize = 'hero' | 'field'

interface AmountFieldProps {
  /** Raw user-typed amount string (the parent owns parsing to minor units). */
  value: string
  onChangeText: (text: string) => void
  currency: CurrencyCode
  /** Visual weight: `hero` (the Home centerpiece) or `field` (forms / sheets). */
  size?: AmountFieldSize
  /** Focus on mount - the Home amount field uses this for boot-to-input. */
  autoFocus?: boolean
  accessibilityLabel?: string
  /** Override the placeholder (defaults to "0"). */
  placeholder?: string
}

/**
 * The canonical amount input (design section 9): currency symbol + numeric
 * value, tabular numerals, numeric keypad. Two sizes:
 *
 * - `hero` - large and centered; the Home screen's centerpiece. Autofocuses so
 *   the numeric keypad is on screen the moment Home opens.
 * - `field` - compact, left-aligned with a hairline border; used inside bottom
 *   sheets and (later) account create/edit forms.
 *
 * The component is intentionally dumb about money math: it only renders the
 * string the parent owns. Parsing to minor units lives in the form model
 * (`pages/home/model/amount`), keeping the primitive reusable.
 */
export const AmountField = forwardRef<TextInput, AmountFieldProps>(function AmountField(
  { value, onChangeText, currency, size = 'hero', autoFocus = false, accessibilityLabel, placeholder = '0' },
  ref,
) {
  const tokens = useTokens()
  const { i18n } = useTranslation()
  const locale: AppLocale = i18n.language === 'ru' ? 'ru' : 'en'
  const symbol = currencySymbol(currency)
  // VoiceOver/TalkBack label includes the localized currency name so the
  // announced context is complete ("Amount, US Dollar"); the field's own text
  // (the typed digits) is voiced naturally as the user types.
  const resolvedLabel = accessibilityLabel
    ? `${accessibilityLabel}, ${currencyName(currency, locale)}`
    : undefined

  if (size === 'field') {
    return (
      <View
        style={[
          styles.fieldWrap,
          { backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      >
        <Text size="label" weight={500} tone="muted" style={styles.fieldSymbol}>
          {symbol}
        </Text>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.mutedForeground}
          keyboardType="decimal-pad"
          returnKeyType="done"
          autoFocus={autoFocus}
          accessibilityLabel={resolvedLabel}
          style={[styles.inputBase, styles.fieldInput, { color: tokens.foreground }]}
        />
      </View>
    )
  }

  return (
    <View style={styles.heroWrap}>
      <Text size="title" weight={500} tone="muted" style={styles.heroSymbol}>
        {symbol}
      </Text>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.mutedForeground}
        keyboardType="decimal-pad"
        returnKeyType="done"
        autoFocus={autoFocus}
        selectTextOnFocus
        // Not a heading: it is an editable text field. The native editable-text
        // behavior voices each typed digit, satisfying "amount announced while
        // typing" (design section 11).
        accessibilityLabel={resolvedLabel}
        style={[
          styles.inputBase,
          styles.heroInput,
          { color: tokens.ink },
        ]}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  inputBase: {
    fontFamily: 'Outfit-SemiBold',
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  // hero
  heroWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  heroSymbol: {
    paddingBottom: 6,
  },
  heroInput: {
    fontSize: 46,
    lineHeight: 54,
    minWidth: 72,
    textAlign: 'center',
  },
  // field
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  fieldSymbol: {},
  fieldInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
  },
})
