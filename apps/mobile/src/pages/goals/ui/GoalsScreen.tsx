import { ScreenPlaceholder } from '@/shared/ui/screen-placeholder'

/**
 * Placeholder destination for the Home "Цели" quick action. Goals are
 * planned but not built - no API and no screens exist yet (see
 * docs/product/mobile-home.md and docs/assumptions.md).
 */
export function GoalsScreen() {
  return (
    <ScreenPlaceholder
      testID="screen-goals"
      title="Цели"
      hint="Отслеживание целей появится позже."
    />
  )
}
