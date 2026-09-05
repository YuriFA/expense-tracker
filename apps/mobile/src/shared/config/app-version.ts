import Constants from 'expo-constants'

/**
 * Build version resolution (spec: `app-version`).
 *
 * The version comes from the embedded Expo manifest (app.json `version`,
 * frozen into the bundle at build time - Expo Go and dev clients read the
 * same field, so dev and store builds report their own manifest version,
 * unlike web where dev reports `dev` because nothing is injected). A
 * manifest-less runtime falls back to the native application version and
 * then to `dev`.
 */
export function resolveAppVersion(
  manifestVersion: string | undefined,
  nativeVersion: string | undefined,
): string {
  return manifestVersion || nativeVersion || 'dev'
}

/** Build version of this app, logged at startup (see `_layout.tsx`). */
export const APP_VERSION = resolveAppVersion(
  Constants.expoConfig?.version,
  Constants.nativeApplicationVersion,
)
