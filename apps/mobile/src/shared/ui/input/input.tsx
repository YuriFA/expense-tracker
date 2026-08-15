import { TextInput, type TextInputProps, View } from 'react-native'
import { Text } from '../text'
import { Icon } from '../icon'
import { cn } from '@/shared/lib/utils'

export interface InputProps extends Omit<TextInputProps, 'placeholderTextColor'> {
  label?: string
  placeholder?: string
  error?: string
  helperText?: string
  leadingIcon?: string
  trailingIcon?: string
  containerClassName?: string
}

export function Input({
  label,
  placeholder,
  error,
  helperText,
  leadingIcon,
  trailingIcon,
  containerClassName,
  style,
  ...textInputProps
}: InputProps) {
  const hasError = Boolean(error)
  const borderColor = hasError ? 'border-destructive' : 'border-border'

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

        <TextInput
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
