import { useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '@/shared/ui/screen'
import { Text } from '@/shared/ui/text'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { useAuth } from '@/entities/session'
import { useLocalDatabase } from '@/shared/lib/db/database-context'
import { readSyncStatus } from '@/shared/lib/sync/sync-status'
import { useSyncController } from '@/shared/lib/sync/sync-provider'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'ещё не выполнялась'
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return 'ещё не выполнялась'
  return new Date(time).toLocaleString('ru-RU')
}

export function SettingsScreen() {
  const { status: authStatus, user, logout } = useAuth()
  const db = useLocalDatabase()
  const { runNow } = useSyncController()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const syncStatusQuery = useQuery({
    queryKey: ['sync', 'status'],
    queryFn: async () => readSyncStatus(db),
    enabled: authStatus === 'authenticated',
  })

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
    <Screen testID="screen-settings">
      <ScrollView>
        <View className="p-6 gap-6">
          <View className="gap-2">
            <Text variant="h2">Настройки</Text>
          </View>

          <View className="gap-3 rounded-2xl bg-card p-4" testID="settings-account-section">
            <Text variant="h4">Аккаунт</Text>
            {authStatus === 'authenticated' && user ? (
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
          </View>

          {authStatus === 'authenticated' ? (
            <View className="gap-3 rounded-2xl bg-card p-4" testID="settings-sync-section">
              <View className="flex-row items-center gap-2">
                <Icon name="cloud-outline" size={20} colorClassName="accent-primary" />
                <Text variant="h4">Синхронизация</Text>
              </View>
              <Text variant="body-sm" className="text-muted-foreground" testID="settings-sync-last">
                {`Последняя синхронизация: ${formatSyncedAt(syncStatusQuery.data?.lastSyncedAt ?? null)}`}
              </Text>
              {syncStatusQuery.data && syncStatusQuery.data.pendingOperations > 0 ? (
                <Text variant="body-sm" className="text-muted-foreground">
                  {`Ожидают отправки: ${syncStatusQuery.data.pendingOperations}`}
                </Text>
              ) : null}
              {syncStatusQuery.data && syncStatusQuery.data.unresolvedConflicts > 0 ? (
                <Text variant="body-sm" className="text-destructive">
                  {`Неразрешённых конфликтов: ${syncStatusQuery.data.unresolvedConflicts}`}
                </Text>
              ) : null}
              <Button
                variant="outline"
                text="Синхронизировать сейчас"
                onPress={runNow}
                testID="settings-sync-now-button"
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  )
}
