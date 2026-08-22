import { View, type ViewProps } from 'react-native'
import { cn } from '@/shared/lib/utils'
import { ScreenHeaderScrollProvider } from '../screen-header/screen-header-context'

export interface ScreenProps extends Omit<ViewProps, 'children'> {
  className?: string
  /** Apply the top safe-area padding. Disable when a child (e.g. ScreenHeader) owns the top inset. @default true */
  topInset?: boolean
  children: React.ReactNode
}

/**
 * Every screen's root container. Also hosts the ScreenHeader scroll wiring
 * (screen-header slice), so a stack screen composes `<ScreenHeader>` and its
 * Screen* scroll container as plain siblings; tab screens simply never
 * consume it.
 */
export function Screen({ className, topInset = true, children, ...viewProps }: ScreenProps) {
  return (
    <View className={cn('flex-1', topInset && 'pt-safe', className)} {...viewProps}>
      <ScreenHeaderScrollProvider>{children}</ScreenHeaderScrollProvider>
    </View>
  )
}
