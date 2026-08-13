import { TextInput, type TextInputProps, View } from "react-native"
import { Text } from "@/shared/ui"

export interface AmountInputProps extends Omit<TextInputProps, "value" | "onChangeText" | "keyboardType"> {
  /**
   * Amount value (stored as number of cents/minor units)
   */
  value: number
  /**
   * Change handler
   */
  onValueChange: (amount: number) => void
  /**
   * Currency symbol
   * @default "$"
   */
  currencySymbol?: string
  /**
   * Locale for formatting (affects decimal separator)
   * @default "en-US"
   */
  locale?: string
  /**
   * Maximum decimal places
   * @default 2
   */
  precision?: number
  /**
   * Label text
   */
  label?: string
  /**
   * Placeholder text
   */
  placeholder?: string
  /**
   * Error message
   */
  error?: string
  /**
   * Helper text
   */
  helperText?: string
  /**
   * Minimum value
   */
  min?: number
  /**
   * Maximum value
   */
  max?: number
}

/**
 * AmountInput - Specialized numeric input for currency amounts
 *
 * Domain-specific component for entering expense amounts.
 * Handles currency formatting, decimal separator, and precision.
 *
 * TODO: Move to entities/transaction/ui or features/transaction/ui
 * when the FSD structure is fully implemented.
 *
 * @example
 * <AmountInput
 *   value={12550}
 *   onValueChange={(amount) => setAmount(amount)}
 *   currencySymbol="$"
 *   label="Amount"
 * />
 */
export function AmountInput(props: AmountInputProps) {
  const {
    value,
    onValueChange,
    currencySymbol = "$",
    locale = "en-US",
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

  // Get decimal separator based on locale
  const decimalSeparator = locale === "en-US" ? "." : ","

  // Format value for display (convert cents to formatted string)
  const formatAmount = (amount: number): string => {
    if (amount === 0) return ""
    const majorUnits = amount / Math.pow(10, precision)
    return majorUnits.toFixed(precision)
  }

  // Parse input string to cents
  const parseAmount = (text: string): number => {
    if (!text) return 0

    // Replace decimal separator with dot for parsing
    const normalizedText = text.replace(decimalSeparator, ".")
    const majorUnits = parseFloat(normalizedText)

    if (isNaN(majorUnits)) return 0

    // Convert to cents and round
    return Math.round(majorUnits * Math.pow(10, precision))
  }

  const handleChange = (text: string) => {
    // Allow empty input (will be parsed as 0)
    if (!text) {
      onValueChange(0)
      return
    }

    // Filter valid characters: digits and decimal separator
    const validChars = `0123456789${decimalSeparator}`
    const filtered = text.split("").filter(c => validChars.includes(c)).join("")

    // Don't allow multiple decimal separators
    const separatorCount = (filtered.match(new RegExp(`\\${decimalSeparator}`, "g")) || []).length
    if (separatorCount > 1) return

    // Parse and validate
    const parsed = parseAmount(filtered)
    const clamped = Math.max(min, Math.min(max, parsed))

    onValueChange(clamped)
  }

  const displayValue = formatAmount(value)
  const hasError = Boolean(error)
  const borderColor = hasError ? "border-destructive" : "border-border"

  return (
    <View className="gap-1.5">
      {label && (
        <Text variant="label" className={hasError ? "text-destructive" : ""}>
          {label}
        </Text>
      )}

      <View className="flex-row items-center bg-card border border-border rounded-lg overflow-hidden">
        <Text variant="body" className="text-muted-foreground px-4 py-3">
          {currencySymbol}
        </Text>

        <TextInput
          className="flex-1 text-foreground px-2 py-3"
          placeholder={placeholder || "0.00"}
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
