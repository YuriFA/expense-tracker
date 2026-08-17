import { View, type ViewProps } from 'react-native'
import { cn } from '@/shared/lib/utils'

/**
 * Vertical composition for one form field: `FormLabel`, the control (e.g.
 * `Input`), `FormError`. Owns only layout — field state and validation stay
 * in the form itself.
 */
export function FormField({ className, ...viewProps }: ViewProps) {
  return <View className={cn('gap-1.5', className)} {...viewProps} />
}
