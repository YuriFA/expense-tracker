// Second-device household guard (household-join design D7): a device that
// was not open during a join/leave still holds the OLD household's
// bookkeeping. On mount and on every foreground (while authenticated) it
// compares the server-reported household against the local last_household
// marker; on a mismatch the user must pick the carry/clean path through the
// shared choice dialog before the device keeps syncing. Mounted once
// globally (the ConflictCenter pattern); renders nothing.
//
// Failure to fetch the household (offline / backend unavailable) skips the
// check silently - offline-first never blocks startup on it. A sync run
// slipping in before the choice is acceptable: the rebase clears the
// outbox/conflicts wholesale by design (D4).

import { useCallback, useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { householdApi } from '@/entities/household'
import { setLastHousehold } from '@expense-tracker/local-data'
import { householdNeedsRebase } from '@expense-tracker/local-data'
import { useAuth } from '@/entities/session'
import { useLocalDatabase } from '@/shared/lib/db/database-context'
import { useHouseholdJoin } from '../model/use-household-join'

export function HouseholdRebaseGuard() {
  const db = useLocalDatabase()
  const { status } = useAuth()
  const { chooseHouseholdData } = useHouseholdJoin()

  // Guards against stacked dialogs: the check runs on mount, on the auth
  // flip to authenticated, and on every foreground - any of those can
  // overlap while a previous choice dialog is still up.
  const checkingRef = useRef(false)

  const checkHousehold = useCallback(async () => {
    if (status !== 'authenticated' || checkingRef.current) return
    checkingRef.current = true
    try {
      const household = await householdApi.getHousehold()
      if (householdNeedsRebase(db, household.id)) {
        await chooseHouseholdData(household)
      } else {
        // First run after the upgrade (null marker) or the current
        // household: record it and continue.
        setLastHousehold(db, household.id)
      }
    } catch {
      // Offline or backend unavailable: skip silently this round.
    } finally {
      checkingRef.current = false
    }
  }, [chooseHouseholdData, db, status])

  useEffect(() => {
    void checkHousehold()
  }, [checkHousehold])

  // Foreground trigger, alongside the SyncProvider's own AppState listener.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void checkHousehold()
    })
    return () => subscription.remove()
  }, [checkHousehold])

  return null
}
