## 1. Version resolution + startup line

- [x] 1.1 `shared/config/app-version.ts`: `resolveAppVersion(manifest,
      native)` pure resolver + `APP_VERSION` (expo-constants), with unit
      tests
- [x] 1.2 Export `API_BASE_URL` from the mobile API client; boot version
      line in `_layout.tsx` (own version, API `/api/health` version when
      reachable, fire-and-forget)
- [x] 1.3 Archive the change
