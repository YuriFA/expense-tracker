import { TextInput, type TextInputProps, View } from "react-native"
import { Text } from "../text"
import { Icon } from "../icon"

export interface InputProps extends Omit<TextInputProps, "placeholderTextColor"> {
  label?: string
  placeholder?: string
  error?: string
  helperText?: string
  leadingIcon?: string
  trailingIcon?: string
  containerClassName?: string
}

export function Input(props: InputProps) {
  const {
    label,
    placeholder,
    error,
    helperText,
    leadingIcon,
    trailingIcon,
    containerClassName,
    style,
    ...textInputProps
  } = props

  const hasError = Boolean(error)
  const borderColor = hasError ? "border-destructive" : "border-border"
  const textColor = "text-foreground"
  const placeholderColor = "text-muted-foreground"

  return (
    <View className={`gap-1.5 ${containerClassName || ""}`}>
      {label && (
        <Text variant="label" className={hasError ? "text-destructive" : ""}>
          {label}
        </Text>
      )}

      <View className="flex-row items-center">
        {leadingIcon && (
          <Icon
            name={leadingIcon}
            size={20}
            color={hasError ? "text-destructive" : "text-muted-foreground"}
            className="mr-3"
          />
        )}

        <TextInput
          className={`flex-1 bg-card border ${borderColor} rounded-lg px-4 py-3 ${textColor}`}
          placeholder={placeholder || (label ? `Enter ${label.toLowerCase()}` : "")}
          placeholderTextColor={placeholderColor}
          style={style}
          {...textInputProps}
        />

        {trailingIcon && (
          <Icon
            name={trailingIcon}
            size={20}
            color={hasError ? "text-destructive" : "text-muted-foreground"}
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
