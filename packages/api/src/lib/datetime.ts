// Minimal date/time primitives shared by the domain model (normalization) and
// the repository query contracts. Kept deliberately small and DOM-free: only
// the fetch-family globals (`fetch`/`Request`/`Response`) appear elsewhere in
// this package, all of which are available in browsers, Node, and React Native.
//
// Calendar/date-range UI adapters live in each app (web has its own richer
// date lib on top of these primitives).

/** ISO-8601 calendar day or datetime string, e.g. `2024-01-15` or `2024-01-15T10:30:00Z`. */
export type IsoDateTime = string

/** Calendar day in `YYYY-MM-DD` form (a plain string; apps may brand it locally). */
export type CalendarDay = string

export const isIsoDateTime = (value: string): value is IsoDateTime => {
  return !Number.isNaN(Date.parse(value))
}
