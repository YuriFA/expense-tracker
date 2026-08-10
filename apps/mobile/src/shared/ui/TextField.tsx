import {
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { type PropsWithChildren } from 'react'
import { useTokens } from './theme'
import { Text } from './Text'

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string
  error?: string | null
  containerStyle?: ViewStyle
}

/**
 * Single-line text field (comment, names). Uses the surface + border tokens
 * with a hairline outline; the error is announced inline and the field gains a
 * destructive outline when invalid. Touch target >= 44pt.
 */
export function TextField({
  label,
  error,
  containerStyle,
  ...inputProps
}: TextFieldProps) {
  const tokens = useTokens()

  return (
    <View style={containerStyle}>
      {label ? (
        <Text size="label" tone="muted" style={{ marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={tokens.mutedForeground}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            color: tokens.foreground,
            borderColor: error ? tokens.destructive : tokens.border,
            backgroundColor: tokens.surface,
          },
        ]}
        {...inputProps}
      />
      {error ? (
        <Text size="caption" tone="destructive" style={{ marginTop: 6 }}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

/** Layout helper: stacks fields with consistent vertical rhythm. */
export function FieldGroup({ children }: PropsWithChildren) {
  return <View style={{ gap: 16 }}>{children}</View>
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Outfit',
  },
})
