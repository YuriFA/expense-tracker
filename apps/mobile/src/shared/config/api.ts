// Backend origin, outside the api-client seam so non-client consumers (the
// startup version line's health probe) don't import shared/api/client.ts.
// Override with EXPO_PUBLIC_API_URL (e.g. 10.0.2.2:8080 for an Android
// emulator); the default http://localhost:8080 works from the iOS simulator,
// which shares the host network. EXPO_PUBLIC_* vars are inlined by Metro at
// bundle time - restart the dev server after changing them.

/** Backend origin: the apiClient's base and the health-probe prefix. */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080'
