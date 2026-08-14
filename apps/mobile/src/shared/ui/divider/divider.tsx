import { View } from 'react-native'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Divider(props: DividerProps) {
  const { orientation = 'horizontal', className } = props

  if (orientation === 'vertical') {
    return <View className={`w-px bg-border ${className || ''}`.trim()} />
  }

  return <View className={`h-px bg-border ${className || ''}`.trim()} />
}
