export interface Debtor {
  id: string
  name: string
  /** Optional free-form note; always a string on the wire (never null). */
  note: string
  /** Optimistic-concurrency revision (bumped on every server update). */
  version: number
}
