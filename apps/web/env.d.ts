/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REPO_VARIANT?: 'http' | 'localStorage'
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

