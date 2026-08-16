// Sync status badge (task 4.5): a compact pill surfacing the sync state -
// unresolved conflicts first, then the paused (auth expired) state, the
// in-flight cycle, the pending outbox count, and the settled "synced" state.
// Tapping it opens the conflict resolution flow when conflicts exist and
// otherwise forces a manual sync run. Hidden entirely while anonymous: the
// app is fully usable offline and the badge only describes SERVER sync.

import { ActivityIndicator } from 'react-native'
import { Pressable } from '@/shared/ui/pressable'
import { Text } from '@/shared/ui/text'
import { Icon } from '@/shared/ui/icon'
import { useAuth } from '@/entities/session'
import { useLocalDatabase } from '@/shared/lib/db/database-context'
import { readSyncStatus } from '@/shared/lib/sync/sync-status'
import { useSyncController } from '@/shared/lib/sync/sync-provider'
import { useQuery } from '@tanstack/react-query'

export function SyncStatusBadge() {
  const db = useLocalDatabase()
  const { status: authStatus } = useAuth()
  const { engineState, runNow, presentConflicts } = useSyncController()

  const statusQuery = useQuery({
    queryKey: ['sync', 'status'],
    queryFn: async () => readSyncStatus(db),
    enabled: authStatus === 'authenticated',
  })

  if (authStatus !== 'authenticated') return null

  const pending = statusQuery.data?.pendingOperations ?? 0
  const conflicts = statusQuery.data?.unresolvedConflicts ?? 0

  let iconName: Parameters<typeof Icon>[0]['name'] = 'checkmark-circle'
  let label = 'Синхронизировано'
  let iconClassName = 'accent-muted-foreground'
  let onPress: () => void = runNow

  if (conflicts > 0) {
    iconName = 'warning'
    label = `Конфликты: ${conflicts}`
    iconClassName = 'accent-destructive'
    onPress = presentConflicts
  } else if (engineState.paused) {
    iconName = 'time'
    label = 'Сессия истекла'
    iconClassName = 'accent-destructive'
    onPress = () => undefined
  } else if (engineState.running) {
    label = 'Синхронизация…'
    iconClassName = 'accent-primary'
  } else if (pending > 0) {
    iconName = 'cloud-upload-outline'
    label = `${pending} ожидает отправки`
    iconClassName = 'accent-primary'
  }

  return (
    <Pressable
      testID="sync-status-badge"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="self-start flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"
    >
      {engineState.running ? (
        <ActivityIndicator size="small" />
      ) : (
        <Icon name={iconName} size={14} colorClassName={iconClassName} />
      )}
      <Text variant="caption" className="text-muted-foreground" testID="sync-status-value">
        {label}
      </Text>
    </Pressable>
  )
}
