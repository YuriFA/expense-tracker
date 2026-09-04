import { View } from 'react-native'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import { legacyCategoryIcon } from '@/shared/lib/legacy-category-icon'

interface CategoryAvatarProps {
  /** Stored category icon string (emoji, or a legacy Ionicons glyph name). */
  icon: string
  /** Data color (hex from the category record); falls back to `bg-muted`. */
  color?: string
  /** Circle size classes, e.g. 'h-10 w-10'. */
  boxClassName?: string
  /** Emoji font size; defaults to 20. */
  iconSize?: number
}

// Design-system identity: "emoji glyph on a pastel tinted circle" - the
// tint is the category's own stored color at ~15% alpha (the mobile twin
// of the web CategoryAvatar's color-mix), so it reads on light and dark
// surfaces alike. Colorless data falls back to the muted token.
export function CategoryAvatar({ icon, color, boxClassName, iconSize = 20 }: CategoryAvatarProps) {
  const tint = color !== undefined && /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}26` : undefined
  return (
    <View
      className={cn(
        'items-center justify-center rounded-full',
        tint === undefined && 'bg-muted',
        boxClassName,
      )}
      style={tint !== undefined ? { backgroundColor: tint } : undefined}
    >
      <Text aria-hidden style={{ fontSize: iconSize }}>
        {legacyCategoryIcon(icon)}
      </Text>
    </View>
  )
}
