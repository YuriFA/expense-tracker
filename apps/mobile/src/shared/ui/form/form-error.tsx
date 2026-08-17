import { cn } from '@/shared/lib/utils'
import { Text, type TextProps } from '../text'

/**
 * Validation message for a form field. Renders nothing while `children` is
 * empty, so callers pass the error string unconditionally; shown messages are
 * announced via an accessibility alert.
 */
export function FormError({ children, className, ...textProps }: Omit<TextProps, 'variant'>) {
  if (!children) return null

  return (
    <Text
      {...textProps}
      variant="caption"
      className={cn('text-destructive', className)}
      accessibilityRole="alert"
    >
      {children}
    </Text>
  )
}
