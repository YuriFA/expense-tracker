import { View } from 'react-native'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Divider({ orientation = 'horizontal', className }: DividerProps) {
  if (orientation === 'vertical') {
    return <View className={`w-px bg-border ${className || ''}`.trim()} />
  }

  return <View className={`h-px bg-border ${className || ''}`.trim()} />
}
