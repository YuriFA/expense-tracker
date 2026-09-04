// Local-first storage bridge: the dedicated SQLite-WASM/OPFS worker and its
// main-thread singleton (design D1-D3).
export { getLocalDbApi, useLocalDbBootState, onSyncRunComplete } from './local-db'
export type { LocalDbApi } from './local-db-api'
export { rehydrateRepositoryError } from './rehydrate-repository-error'
export { provideSyncController, useSyncController, type SyncController } from './sync-composable'
