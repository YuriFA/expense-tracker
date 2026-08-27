// The shared "join data choice" flow (household-join design D6), used by
// every path that lands the device in a NEW household: invitation accept,
// join-by-code, leave, and the second-device startup/foreground mismatch
// (D7). Whatever made the change, the local bookkeeping must follow before
// the sync engine runs as the new household:
//
// - carry: `rebaseLocalDataForHousehold` resets versions/cursor and
//   regenerates the outbox as base-0 creates (also stores last_household);
// - clean: `wipeLocalData` + re-bind the owner + stamp last_household.
//
// Both paths then invalidate every cached query and force a sync run. The
// choice itself comes either from the caller (the invite screen renders it
// inline - no second dialog) or from the non-cancelable Alert below
// (join-by-code / leave / startup, where no prior screen asked).

import { useCallback, useMemo } from 'react'
import { Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import type { Household } from '@expense-tracker/api'
import {
  rebaseLocalDataForHousehold,
  setLastHousehold,
  setOwnerUserId,
  wipeLocalData,
} from '@expense-tracker/local-data'
import { useAuth } from '@/entities/session'
import { useLocalDatabase } from '@/shared/lib/db/database-context'
import { useSyncController } from '@/shared/lib/sync/sync-context'

export type HouseholdDataChoice = 'carry' | 'clean'

export interface HouseholdJoinController {
  /** Applies an already-made choice to the local database and sync state. */
  performHouseholdJoin(household: Household, choice: HouseholdDataChoice): Promise<void>
  /**
   * Asks the user through a non-cancelable Alert (carry first) and applies
   * the chosen path. Resolves once the choice has been applied.
   */
  chooseHouseholdData(household: Household): Promise<void>
}

export function useHouseholdJoin(): HouseholdJoinController {
  const db = useLocalDatabase()
  const queryClient = useQueryClient()
  const { runNow } = useSyncController()
  const { user } = useAuth()

  const performHouseholdJoin = useCallback(
    async (household: Household, choice: HouseholdDataChoice) => {
      if (choice === 'carry') {
        // The rebase itself stamps the last_household marker (design D4).
        rebaseLocalDataForHousehold(db, household.id)
      } else {
        // The wipe drops the marker (and the owner binding) - restamp both.
        wipeLocalData(db)
        if (user) setOwnerUserId(db, user.id)
        setLastHousehold(db, household.id)
      }
      await queryClient.invalidateQueries()
      runNow()
    },
    [db, queryClient, runNow, user],
  )

  const chooseHouseholdData = useCallback(
    (household: Household) =>
      new Promise<void>((resolve) => {
        // TODO(i18n): RU wording until mobile i18n wiring lands.
        Alert.alert(
          'Новое домохозяйство',
          'Домохозяйство изменилось. Что сделать с данными на этом устройстве?',
          [
            {
              text: 'Перенести данные',
              onPress: () => {
                void performHouseholdJoin(household, 'carry').then(resolve, resolve)
              },
            },
            {
              text: 'Начать с чистого листа',
              style: 'destructive',
              onPress: () => {
                void performHouseholdJoin(household, 'clean').then(resolve, resolve)
              },
            },
          ],
          { cancelable: false },
        )
      }),
    [performHouseholdJoin],
  )

  return useMemo(
    () => ({ performHouseholdJoin, chooseHouseholdData }),
    [chooseHouseholdData, performHouseholdJoin],
  )
}
