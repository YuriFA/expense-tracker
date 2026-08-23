import { Screen } from '@/shared/ui/screen'
import { ScreenHeader, ScreenScrollView } from '@/shared/ui/screen-header'
import { ScreenPlaceholder } from '@/shared/ui/screen-placeholder'

export function VerifyEmailScreen() {
  return (
    <Screen testID="screen-verify-email" topInset={false}>
      <ScreenHeader title="Подтверждение email" />
      <ScreenScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ScreenPlaceholder hint="Auth flow placeholder." />
      </ScreenScrollView>
    </Screen>
  )
}
