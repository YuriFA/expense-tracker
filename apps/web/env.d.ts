/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Optional absolute base URL for the API client (defaults to same-origin proxy). */
  readonly VITE_API_BASE_URL?: string
  /** Override the dev/preview proxy target (defaults to http://localhost:8080). */
  readonly VITE_API_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Build version, replaced by Vite at build time (vite.config.ts `define`,
 * sourced from VITE_APP_VERSION; 'dev' when unset). Declared optional
 * because raw non-Vite consumers (plain node) never see the replacement.
 */
declare const __APP_VERSION__: string | undefined
