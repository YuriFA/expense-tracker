import { Text as RNText, type TextProps, type TextStyle } from 'react-native'
import { useTokens } from './theme'
import { familyForWeight, type FontWeight } from '@shared/lib/fonts'
import { cn } from '@shared/lib/cn'

export type TextSize = 'display' | 'title' | 'body' | 'label' | 'caption'
export type TextTone = 'default' | 'muted' | 'ink' | 'inverse' | 'destructive'

const SIZE_LINE_HEIGHT: Record<TextSize, { fontSize: number; lineHeight: number }> = {
  display: { fontSize: 34, lineHeight: 40 },
  title: { fontSize: 22, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
}

interface AppTextProps extends TextProps {
  size?: TextSize
  weight?: FontWeight
  tone?: TextTone
  /** Use tabular (monospaced) figures - required for all amounts. */
  tabular?: boolean
  /** Extra classes composed onto the text (react-native-reusables idiom). */
  className?: string
}

/**
 * Foundation text primitive. Hierarchy comes from weight + size (one family -
 * Outfit - per the design system), never from a family change. Pass `tabular`
 * for any amount so digits align column-for-column.
 */
export function Text({
  size = 'body',
  weight = 400,
  tone = 'default',
  tabular = false,
  className,
  style,
  ...rest
}: AppTextProps) {
  const tokens = useTokens()
  const typography = SIZE_LINE_HEIGHT[size]

  const color =
    tone === 'muted'
      ? tokens.mutedForeground
      : tone === 'ink'
        ? tokens.ink
        : tone === 'inverse'
          ? tokens.inkForeground
          : tone === 'destructive'
            ? tokens.destructive
            : tokens.foreground

  const textStyle: TextStyle = {
    fontFamily: familyForWeight(weight),
    fontSize: typography.fontSize,
    lineHeight: typography.lineHeight,
    color,
    ...(tabular ? { fontVariant: ['tabular-nums'] } : {}),
  }

  return <RNText className={cn(className)} style={[textStyle, style]} {...rest} />
}
