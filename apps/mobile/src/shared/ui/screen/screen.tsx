import { View, type ViewProps } from 'react-native'

export interface ScreenProps extends Omit<ViewProps, 'children'> {
  className?: string
  children: React.ReactNode
  backgroundColor?: string
}

export function Screen({ className, children, ...viewProps }: ScreenProps) {
  return (
    <View className={`flex-1 p-safe ${className || ''}`} {...viewProps}>
      {children}
    </View>
  )
}
