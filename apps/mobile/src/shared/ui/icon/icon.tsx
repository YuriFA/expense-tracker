import type { ComponentProps } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { withUniwind } from 'uniwind'

// Ionicons is a third-party component, so wrapping it with withUniwind is the
// sanctioned way to give it className support (RN core components must NOT be
// wrapped - they already support className natively). The wrapper also maps
// the `color` prop to `colorClassName` with the `accent-` prefix.
const StyledIonicons = withUniwind(Ionicons)

/**
 * Strict union of valid Ionicons glyph names - a typo in `name` fails at
 * compile time. Browse available icons: https://icons.expo.fyi/
 */
export type IconName = ComponentProps<typeof Ionicons>['name']

export interface CustomIconProps extends Omit<ComponentProps<typeof Ionicons>, 'color'> {
  size?: number
  className?: string
  /**
   * Design-token color as an `accent-…` class (e.g. 'accent-foreground').
   * Preferred over `color` for static colors - it follows the active theme.
   */
  colorClassName?: string
  /**
   * Raw color string - only for dynamic data colors (e.g. a category color
   * from the API) that cannot be expressed as a class.
   */
  color?: string | undefined
}

export function Icon({
  name,
  size = 24,
  color,
  colorClassName,
  className,
  ...iconProps
}: CustomIconProps) {
  return (
    <StyledIonicons
      name={name}
      size={size}
      color={color}
      colorClassName={colorClassName}
      className={className}
      {...iconProps}
    />
  )
}
