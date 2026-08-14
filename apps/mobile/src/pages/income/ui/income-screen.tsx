import { ScreenPlaceholder } from '@/shared/ui/screen-placeholder'

/**
 * Placeholder destination for the Home "Доходы" quick action. The real
 * income screen is planned but not built (see docs/product/mobile-home.md).
 */
export function IncomeScreen() {
  return (
    <ScreenPlaceholder testID="screen-income" title="Доходы" hint="Экран доходов появится позже." />
  )
}
