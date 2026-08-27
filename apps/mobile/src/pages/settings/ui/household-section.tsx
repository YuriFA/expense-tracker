// Household card (household-join design D6): the current household's
// display name (owner email prefix fallback) and members count, the
// «У меня есть код» join entry (bottom-sheet form), and the leave flow
// (confirm alert → leave → the shared data-choice dialog, carry default:
// leaving keeps the local copy in the fresh personal household). Renders
// only while authenticated; the household query and both mutation states
// are owned here (components-and-state.md §5).
//
// TODO(i18n): RU wording until mobile i18n wiring lands.

import { useState } from 'react'
import { Alert, View } from 'react-native'
import { router } from 'expo-router'
import { householdApi, householdDisplayName, useHousehold } from '@/entities/household'
import { useAuth } from '@/entities/session'
import { useHouseholdJoin } from '@/features/household-join'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { JoinByCodeSheet } from './join-by-code-sheet'

export function HouseholdSection() {
  const { status } = useAuth()
  const householdQuery = useHousehold({ enabled: status === 'authenticated' })
  const { chooseHouseholdData } = useHouseholdJoin()
  const [isLeaving, setIsLeaving] = useState(false)
  // A fresh session id per open mounts a keyed, clean sheet (forms.md §3,
  // the new-debtor-debt-sheet pattern); null = closed.
  const [joinSheetSession, setJoinSheetSession] = useState<number | null>(null)

  if (status !== 'authenticated') return null

  const household = householdQuery.data

  const handleJoinByCode = () => setJoinSheetSession((session) => (session ?? 0) + 1)

  const handleJoined = () => {
    setJoinSheetSession(null)
    router.navigate('/')
  }

  const handleLeaveConfirm = async () => {
    setIsLeaving(true)
    try {
      const personalHousehold = await householdApi.leave()
      // The fresh personal household needs the same data choice (carry
      // default keeps the local copy; the rebase re-syncs it there).
      await chooseHouseholdData(personalHousehold)
      router.navigate('/')
    } catch (cause) {
      // Maps e.g. HOUSEHOLD_OWNER_WITH_MEMBERS to its RU wording.
      Alert.alert('Не удалось выйти', getRepositoryErrorText(cause))
    } finally {
      setIsLeaving(false)
    }
  }

  const handleLeave = () => {
    Alert.alert('Выйти из домохозяйства?', 'Данные останутся доступны другим участникам.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => void handleLeaveConfirm() },
    ])
  }

  return (
    <>
      <Card variant="elevated" className="gap-3" testID="settings-household-section">
        <View className="flex-row items-center gap-2">
          <Icon name="people-outline" size={20} colorClassName="accent-primary" />
          <Text variant="h4">Домохозяйство</Text>
        </View>
        {household ? (
          <>
            <Text variant="body" className="text-foreground" testID="settings-household-name">
              {householdDisplayName(household)}
            </Text>
            <Text
              variant="body-sm"
              className="text-muted-foreground"
              testID="settings-household-members"
            >
              {`Участников: ${household.members.length}`}
            </Text>
          </>
        ) : (
          <Text variant="body-sm" className="text-muted-foreground">
            Загружаем домохозяйство…
          </Text>
        )}
        <Button
          variant="outline"
          text="У меня есть код"
          onPress={handleJoinByCode}
          testID="settings-join-by-code-button"
        />
        <Button
          variant="destructive"
          text="Покинуть домохозяйство"
          loading={isLeaving}
          disabled={isLeaving}
          onPress={handleLeave}
          testID="settings-leave-household-button"
        />
      </Card>
      {joinSheetSession !== null ? (
        <JoinByCodeSheet key={joinSheetSession} onJoined={handleJoined} />
      ) : null}
    </>
  )
}
