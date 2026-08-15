import { View, type ViewProps } from 'react-native'
import { cn } from '@/shared/lib/utils'

export interface ScreenProps extends Omit<ViewProps, 'children'> {
  className?: string
  children: React.ReactNode
  backgroundColor?: string
}

export function Screen({ className, children, ...viewProps }: ScreenProps) {
  return (
    <View className={cn('flex-1 p-safe', className)} {...viewProps}>
      {children}
    </View>
  )
}
