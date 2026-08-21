// Composition seam for the app-layer sync provider: binds the sync
// transport to the shared API client so src/app/_layout.tsx composes the
// engine without importing the client directly (invariant #16 — direct
// apiClient use stays confined to the session API and this folder).

import { apiClient } from '@/shared/api/client'
import { createApiTransport } from './sync-engine'

export function createLocalSyncTransport() {
  return createApiTransport(apiClient)
}
