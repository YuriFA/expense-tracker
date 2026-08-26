# Tasks: web-pwa-i18n

## 1. PWA shell

- [ ] 1.1 Add `vite-plugin-pwa` to `apps/web` devDependencies; configure `generateSW`, `registerType: 'prompt'`, `globPatterns` covering js/css/wasm/worker assets, `navigateFallback` to `index.html` with `/api/**` denylist, no runtime caching
- [ ] 1.2 Replace `public/site.webmanifest` boilerplate: product name/short name, standalone display, token-derived theme/background colors, `lang: ru`, existing icons (incl. maskable)
- [ ] 1.3 Register the SW via the plugin's virtual module with `onNeedRefresh` → vue-sonner toast «Доступно обновление» + reload action; no auto-reload while the user works
- [ ] 1.4 Exclude the unused sqlite3 worker1/opfs-async-proxy assets from precache (spike finding) and verify `dist` contents

## 2. Offline verification

- [ ] 2.1 e2e backendless: load once → `context.setOffline(true)` → cold-start reload loads the shell and operates on local data (dashboard renders from SQLite-WASM)
- [ ] 2.2 e2e: no API response is served from cache while offline (requests fail fast; app stays in local/anonymous mode, no stale server data)
- [ ] 2.3 Manual install checklist documented (Chromium desktop + iOS Safari "На экран Домой") in the change notes

## 3. i18n launch readiness

- [ ] 3.1 Flip `DEFAULT_LOCALE` to `'ru'` in `packages/i18n/src/locale.ts`; run package tests
- [ ] 3.2 Complete EN keys for all web screens (incl. change 2's) in `packages/i18n` locales; RU copy authoritative from mobile strings
- [ ] 3.3 Add a key-parity unit test on the message catalogs (every RU key exists in EN and vice versa) in the i18n package
- [ ] 3.4 Locale switcher (RU/EN) in web settings: immediate effect via the existing i18n instance, choice persisted in localStorage, rehydrated by the existing locale watcher
- [ ] 3.5 Unit tests: RU default for first visit, persistence of the chosen locale, immediate switching

## 4. Docs and gates

- [ ] 4.1 Update `docs/assumptions.md`: close the `DEFAULT_LOCALE` en→ru item, record the PWA direction (prompted updates, no API caching, deferred background sync/push)
- [ ] 4.2 Update `apps/web/AGENTS.md` (PWA config pointer, locale switcher) and architecture overview evidence if paths change
- [ ] 4.3 Full gates: `pnpm -C apps/web type-check test:unit test:e2e i18n:lint`, `pnpm -C packages/i18n type-check test`, `pnpm arch:check`, `pnpm lint`, `pnpm knip`
- [ ] 4.4 `openspec validate web-pwa-i18n --strict` passes
