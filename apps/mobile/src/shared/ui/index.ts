// Public API of the shared UI kit.
//
// Platform primitives the screens reuse, built on the token map + Outfit type.
// Import only through this barrel so the kit stays the single source of UI
// vocabulary across the product.

export { Text, type TextSize, type TextTone } from './Text'
export { Screen } from './Screen'
export {
  Button,
  type ButtonVariant,
  type ButtonSize,
} from './Button'
export { TextField, FieldGroup } from './TextField'
export { SegmentedControl, type SegmentOption } from './SegmentedControl'
export { Chip } from './Chip'
export { ListRow, ListGroup } from './ListRow'
export { BottomSheet } from './BottomSheet'
export { Skeleton, SkeletonLine } from './Skeleton'
export { EmptyState } from './EmptyState'
export { ErrorState } from './ErrorState'
export {
  ThemeContext,
  useTheme,
  useTokens,
  makeThemeValue,
} from './theme'
export { type ThemeTokens } from '@shared/config/theme-tokens'
