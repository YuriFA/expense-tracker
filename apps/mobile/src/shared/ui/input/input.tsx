import { TextInput, type TextInputProps, View } from 'react-native'
import type { ComponentType } from 'react'
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
  /** Visual invalid state: destructive border and icon tint. The validation message itself is rendered by `FormError`. */
  invalid?: boolean
  leadingIcon?: IconName
  trailingIcon?: IconName
  /**
   * Underlying text input implementation. Inputs rendered inside a bottom
   * sheet pass the sheet-aware `BottomSheetTextInput` so focus registers with
   * the sheet's keyboard state; defaults to RN's TextInput.
   */
  textInputComponent?: ComponentType<InputComponentProps>
}

/**
 * Text input primitive: the control itself, its intrinsic accessories
 * (leading/trailing icons), and its visual states. Form presentation — label
 * and validation message — composes around it via `shared/ui/form`.
 */
export function Input({
  invalid = false,
  leadingIcon,
  trailingIcon,
  textInputComponent,
  style,
  ...textInputProps
}: InputProps) {
  const iconColorClassName = invalid ? 'accent-destructive' : 'accent-muted-foreground'
  const TextInputComponent = textInputComponent ?? TextInput

  return (
    <View className="flex-row items-center">
      {leadingIcon && (
        <Icon name={leadingIcon} size={20} colorClassName={iconColorClassName} className="mr-3" />
      )}

      <TextInputComponent
        className={cn('flex-1 bg-card border rounded-lg px-4 py-3 text-foreground', {
          'border-destructive': invalid,
          'border-border': !invalid,
        })}
        placeholderTextColorClassName="accent-muted-foreground"
        style={style}
        {...textInputProps}
      />

      {trailingIcon && (
        <Icon name={trailingIcon} size={20} colorClassName={iconColorClassName} className="ml-3" />
      )}
    </View>
  )
}
