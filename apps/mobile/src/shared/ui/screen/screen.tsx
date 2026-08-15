import { View, type ViewProps } from 'react-native'
import { cn } from '@/shared/lib/utils'

export interface ScreenProps extends Omit<ViewProps, 'children'> {
  className?: string
  children: React.ReactNode
}

export function Screen({ className, children, ...viewProps }: ScreenProps) {
  return (
    <View className={cn('flex-1 pt-safe', className)} {...viewProps}>
      {children}
    </View>
  )
}
