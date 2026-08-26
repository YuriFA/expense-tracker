// Id seam: UUID v4 for locally created records (global invariant: ids are
// UUID v4). The default uses WebCrypto (`crypto.randomUUID()` — browsers,
// Node >= 19). React Native's Hermes has no WebCrypto, so the mobile app
// calls `configureIdFactory` with the expo-crypto implementation once at
// bootstrap (app entry and the headless background-sync module) before any
// database work. Tests may reconfigure to deterministic sequences.

type IdFactory = () => string

let factory: IdFactory = () => crypto.randomUUID()

/** The id generator used by the outbox, conflicts, and repositories. */
export function generateId(): string {
  return factory()
}

/** Replaces the id generator (e.g. expo-crypto on Hermes). Idempotent. */
export function configureIdFactory(next: IdFactory): void {
  factory = next
}
