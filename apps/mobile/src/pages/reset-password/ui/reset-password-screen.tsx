import { Screen } from '@/shared/ui/screen'
import { ScreenHeader, ScreenScrollView } from '@/shared/ui/screen-header'
import { ScreenPlaceholder } from '@/shared/ui/screen-placeholder'

export function ResetPasswordScreen() {
  return (
    <Screen testID="screen-reset-password" topInset={false}>
      <ScreenHeader title="Восстановление пароля" />
      <ScreenScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ScreenPlaceholder hint="Auth flow placeholder." />
      </ScreenScrollView>
    </Screen>
  )
}
