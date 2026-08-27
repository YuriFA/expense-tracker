// The «Профиль» settings group (household-ux 2.5): the account email and the
// display name household members see, with the «Как вас видят участники»
// preview (email fallback when no name is set). Editing happens in the
// display-name sheet. Renders only while authenticated.
//
// TODO(i18n): RU wording until mobile i18n wiring lands.

import { useState } from 'react'
import { View } from 'react-native'
import { memberLabel, useHousehold } from '@/entities/household'
import { useAuth } from '@/entities/session'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { DisplayNameSheet } from './display-name-sheet'

export function ProfileSection() {
  const { status, user } = useAuth()
  const householdQuery = useHousehold({ enabled: status === 'authenticated' })
  // A fresh session id per open mounts a keyed, clean sheet (forms.md §3).
  const [nameSheetSession, setNameSheetSession] = useState<number | null>(null)

  if (status !== 'authenticated' || !user) return null

  const myMember = householdQuery.data?.members.find((member) => member.userId === user.id)

  return (
    <>
      <Card variant="elevated" className="gap-3" testID="settings-profile-section">
        <View className="flex-row items-center gap-2">
          <Icon name="person-outline" size={20} colorClassName="accent-primary" />
          <Text variant="h4">Профиль</Text>
        </View>
        <Text variant="body-sm" className="text-muted-foreground" testID="settings-profile-email">
          {user.email}
        </Text>
        <Text variant="body" className="text-foreground" testID="settings-profile-display-name">
          {myMember ? memberLabel(myMember) : user.email}
        </Text>
        <Text variant="caption" className="text-muted-foreground" testID="settings-profile-preview">
          {myMember?.displayName
            ? `Участники видят вас как: ${myMember.displayName}`
            : `Без имени участники видят ваш email: ${user.email}`}
        </Text>
        <Button
          variant="outline"
          text="Изменить имя"
          onPress={() => setNameSheetSession((session) => (session ?? 0) + 1)}
          testID="settings-profile-edit-name"
        />
      </Card>
      {nameSheetSession !== null ? (
        <DisplayNameSheet
          key={nameSheetSession}
          email={user.email}
          initialName={myMember?.displayName ?? ''}
          onClose={() => setNameSheetSession(null)}
        />
      ) : null}
    </>
  )
}
