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
