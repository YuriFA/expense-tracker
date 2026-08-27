// Household + profile endpoint client: reading the requester's household with
// its members, and editing the current user's display name. Platform-agnostic
// like every HTTP call here - callers supply the fetch-backed ApiClient.

import type { ApiClient } from '../api-client'
import { normalizeHousehold, type Household } from '../domain/household'

function requireData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error('Expected a response body but received none')
  }
  return data
}

/**
 * Fetches the current user's household (members with email, display name,
 * role, and joined date). Rejects only on transport/auth failures.
 */
export async function fetchHousehold(client: ApiClient): Promise<Household> {
  const { data } = await client.GET('/api/household', { params: {} })
  const household = normalizeHousehold(requireData(data))
  if (!household) {
    throw new Error('Received a malformed household from the server')
  }
  return household
}

/**
 * Sets the current user's display name (non-empty, max 100 chars enforced by
 * the contract). Resolves with the updated display name.
 */
export async function updateDisplayName(client: ApiClient, displayName: string): Promise<string> {
  const { data } = await client.PATCH('/api/me', { body: { displayName } })
  const updated = requireData(data).displayName
  if (typeof updated !== 'string' || updated.length === 0) {
    throw new Error('Received a malformed profile response from the server')
  }
  return updated
}
