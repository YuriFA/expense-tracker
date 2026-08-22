import { Screen } from '@/shared/ui/screen'
import { ScreenHeader, ScreenScrollView } from '@/shared/ui/screen-header'
import { ScreenPlaceholder } from '@/shared/ui/screen-placeholder'

/**
 * Placeholder destination for the Home "Цели" quick action. Goals are
 * planned but not built - no API and no screens exist yet (see
 * docs/product/mobile-home.md and docs/assumptions.md).
 */
export function GoalsScreen() {
  return (
    <Screen testID="screen-goals" topInset={false}>
      <ScreenHeader title="Цели" />
      <ScreenScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ScreenPlaceholder hint="Отслеживание целей появится позже." />
      </ScreenScrollView>
    </Screen>
  )
}
