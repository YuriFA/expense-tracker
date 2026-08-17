import { Text, type TextProps } from '../text'

/**
 * Label text for a form field. Presentation-only: tint it via `className`
 * (e.g. destructive while the field is invalid) at the call site.
 */
export function FormLabel({ className, ...textProps }: Omit<TextProps, 'variant'>) {
  return <Text variant="label" className={className} {...textProps} />
}
