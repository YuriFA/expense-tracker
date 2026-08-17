import { TextInput, type TextInputProps, View } from 'react-native'
import type { ComponentType } from 'react'
import { Text } from '../text'
import { Icon, type IconName } from '../icon'
import { cn } from '@/shared/lib/utils'

/**
 * Props Input renders onto the underlying text input: RN's TextInputProps plus
 * the Uniwind class props it styles the field with. Custom implementations
 * passed via `textInputComponent` must be Uniwind-aware (e.g. wrapped with
 * `withUniwind`) to accept these two props.
 */
export type InputComponentProps = TextInputProps & {
  className?: string
  placeholderTextColorClassName?: string
}

export interface InputProps extends Omit<TextInputProps, 'placeholderTextColor'> {
  label?: string
  placeholder?: string
  error?: string
  helperText?: string
  leadingIcon?: IconName
  trailingIcon?: IconName
  containerClassName?: string
  /** testID for the error text (exposed as an accessibility alert). */
  errorTestId?: string
  /**
   * Underlying text input implementation. Inputs rendered inside a bottom
   * sheet pass the sheet-aware `BottomSheetTextInput` so focus registers with
   * the sheet's keyboard state; defaults to RN's TextInput.
   */
  textInputComponent?: ComponentType<InputComponentProps>
}

export function Input({
  label,
  placeholder,
  error,
  helperText,
  leadingIcon,
  trailingIcon,
  containerClassName,
  errorTestId,
  textInputComponent,
  style,
  ...textInputProps
}: InputProps) {
  const hasError = Boolean(error)
  const borderColor = hasError ? 'border-destructive' : 'border-border'
  const TextInputComponent = textInputComponent ?? TextInput

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && (
        <Text variant="label" className={hasError ? 'text-destructive' : ''}>
          {label}
        </Text>
      )}

      <View className="flex-row items-center">
        {leadingIcon && (
          <Icon
            name={leadingIcon}
            size={20}
            colorClassName={hasError ? 'accent-destructive' : 'accent-muted-foreground'}
            className="mr-3"
          />
        )}

        <TextInputComponent
          className={cn('flex-1 bg-card border rounded-lg px-4 py-3 text-foreground', borderColor)}
          placeholder={placeholder || (label ? `Enter ${label.toLowerCase()}` : '')}
          placeholderTextColorClassName="accent-muted-foreground"
          style={style}
          {...textInputProps}
        />

        {trailingIcon && (
          <Icon
            name={trailingIcon}
            size={20}
            colorClassName={hasError ? 'accent-destructive' : 'accent-muted-foreground'}
            className="ml-3"
          />
        )}
      </View>

      {error && (
        <Text
          variant="caption"
          className="text-destructive"
          accessibilityRole="alert"
          testID={errorTestId}
        >
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
