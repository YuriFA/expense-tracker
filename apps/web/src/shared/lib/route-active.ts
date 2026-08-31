// Flat route records: a detail route keeps its section active by name prefix
// (e.g. analytics-detail keeps Аналитика). Shared by the sidebar and the
// mobile tab bar so both shells agree on the active entry (web-screens).
export const isRouteActive = (routeName: unknown, prefix: string): boolean =>
  typeof routeName === 'string' && routeName.startsWith(prefix)
