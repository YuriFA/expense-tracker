// Context exposing the opened local database to the layers that live beside
// the repositories (session ownership checks, the sync engine, the conflict
// center). The repositories keep their own dedicated providers; this one is
// for infrastructure that needs raw db access.

import { createContext, useContext, type ReactNode } from 'react'
import type { LocalDatabase } from './database'

const DatabaseContext = createContext<LocalDatabase | null>(null)

export function DatabaseProvider({
  database,
  children,
}: {
  database: LocalDatabase
  children: ReactNode
}) {
  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>
}

/** Injects the local database; throws when the provider is missing. */
export function useLocalDatabase(): LocalDatabase {
  const database = useContext(DatabaseContext)
  if (!database) {
    throw new Error('useLocalDatabase requires <DatabaseProvider> in the tree')
  }
  return database
}
