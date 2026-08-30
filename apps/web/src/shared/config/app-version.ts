/**
 * Build version resolution (spec: `app-version`).
 *
 * The injected value comes from the Vite `define` (`__APP_VERSION__`,
 * vite.config.ts), which the image build fills from the `VERSION` build
 * argument (the deployed image tag, `sha-<short>`). Builds without the
 * argument - local dev, vitest - report `dev`.
 */
export function resolveAppVersion(injected: string | undefined): string {
  return injected ?? 'dev'
}

/** Build version of this app bundle, logged at startup (see `main.ts`). */
export const APP_VERSION = resolveAppVersion(__APP_VERSION__)
