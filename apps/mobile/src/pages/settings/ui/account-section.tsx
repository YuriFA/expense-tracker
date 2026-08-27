// Account card: the auth-gated profile block — the signed-in email with the
// logout button, or the local-data notice with the login button. Owns its
// logout interaction (pending state + the error alert); the auth status and
// user come from the session context (components-and-state.md §5: own
// interaction model, §8: the renderer subscribes).

import { useState } from 'react'
import { Alert } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/shared/ui/button'
import { Text } from '@/shared/ui/text'
import { useAuth } from '@/entities/session'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { Card } from '@/shared/ui/card'

export function AccountSection() {
  const { status, user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (cause) {
      Alert.alert('Не удалось выйти', getRepositoryErrorText(cause))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <Card variant="elevated" className="gap-3" testID="settings-account-section">
      <Text variant="h4">Аккаунт</Text>
      {status === 'authenticated' && user ? (
        <>
          <Text variant="body" className="text-muted-foreground" testID="settings-user-email">
            {user.email}
          </Text>
          <Button
            variant="outline"
            text="Выйти"
            onPress={handleLogout}
            loading={isLoggingOut}
            testID="settings-logout-button"
          />
        </>
      ) : (
        <>
          <Text variant="body" className="text-muted-foreground">
            Вы работаете с локальными данными. Войдите, чтобы синхронизировать их с сервером.
          </Text>
          <Button
            variant="primary"
            text="Войти"
            onPress={() => router.push('/login')}
            testID="settings-login-button"
          />
        </>
      )}
    </Card>
  )
}
