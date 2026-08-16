import { randomUUID } from 'expo-crypto'

/**
 * RFC-4122 v4 identifier for locally created records (global invariant: ids
 * are UUID v4). Hermes has no WebCrypto, so `globalThis.crypto.randomUUID`
 * is unavailable on device - `expo-crypto` ships with Expo Go and provides a
 * native implementation.
 */
export function generateId(): string {
  return randomUUID()
}
