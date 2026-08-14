import { View, type ViewProps } from 'react-native'

export interface ScreenProps extends Omit<ViewProps, 'children'> {
  className?: string
  children: React.ReactNode
  backgroundColor?: string
}

export function Screen(props: ScreenProps) {
  const { className, children, ...viewProps } = props

  return (
    <View className={`flex-1 p-safe bg-background ${className || ''}`} {...viewProps}>
      {children}
    </View>
  )
}
