import { TextInput, type TextInputProps, View } from 'react-native'
import { Text } from '@/shared/ui'

export interface AmountInputProps extends Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'keyboardType'
> {
  /** Amount in minor units (cents). */
  value: number
  onValueChange: (amount: number) => void
  currencySymbol?: string
  locale?: string
  precision?: number
  label?: string
  placeholder?: string
  error?: string
  helperText?: string
  min?: number
  max?: number
}

// TODO: move to entities/transaction/ui or features/transaction/ui once those
// FSD slices exist.
export function AmountInput(props: AmountInputProps) {
  const {
    value,
    onValueChange,
    currencySymbol = '$',
    locale = 'en-US',
    precision = 2,
    label,
    placeholder,
    error,
    helperText,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    style,
    ...textInputProps
  } = props

  const decimalSeparator = locale === 'en-US' ? '.' : ','

  const formatAmount = (amount: number): string => {
    if (amount === 0) return ''
    const majorUnits = amount / Math.pow(10, precision)
    return majorUnits.toFixed(precision)
  }

  const parseAmount = (text: string): number => {
    if (!text) return 0

    const normalizedText = text.replace(decimalSeparator, '.')
    const majorUnits = parseFloat(normalizedText)

    if (isNaN(majorUnits)) return 0

    return Math.round(majorUnits * Math.pow(10, precision))
  }

  const handleChange = (text: string) => {
    if (!text) {
      onValueChange(0)
      return
    }

    const validChars = `0123456789${decimalSeparator}`
    const filtered = text
      .split('')
      .filter((c) => validChars.includes(c))
      .join('')

    const separatorCount = (filtered.match(new RegExp(`\\${decimalSeparator}`, 'g')) || []).length
    if (separatorCount > 1) return

    const parsed = parseAmount(filtered)
    const clamped = Math.max(min, Math.min(max, parsed))

    onValueChange(clamped)
  }

  const displayValue = formatAmount(value)
  const hasError = Boolean(error)
  const borderColor = hasError ? 'border-destructive' : 'border-border'

  return (
    <View className="gap-1.5">
      {label && (
        <Text variant="label" className={hasError ? 'text-destructive' : ''}>
          {label}
        </Text>
      )}

      <View
        className={`flex-row items-center bg-card border ${borderColor} rounded-lg overflow-hidden`}
      >
        <Text variant="body" className="text-muted-foreground px-4 py-3">
          {currencySymbol}
        </Text>

        <TextInput
          className="flex-1 text-foreground px-2 py-3"
          placeholder={placeholder || '0.00'}
          keyboardType="decimal-pad"
          value={displayValue}
          onChangeText={handleChange}
          style={style}
          {...textInputProps}
        />
      </View>

      {error && (
        <Text variant="caption" className="text-destructive">
          {error}
        </Text>
      )}

      {helperText && !error && (
        <Text variant="caption" className="text-muted-foreground">
          {helperText}
        </Text>
      )}
    </View>
  )
}
