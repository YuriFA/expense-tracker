import { View, type ViewProps } from 'react-native'

export interface BoxProps extends ViewProps {
  className?: string
}

export function Box(props: BoxProps) {
  const { className, style, ...viewProps } = props

  return <View className={className} style={style} {...viewProps} />
}
