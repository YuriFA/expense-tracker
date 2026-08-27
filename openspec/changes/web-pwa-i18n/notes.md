# Notes: web-pwa-i18n

## Manual install checklist (capability `web-pwa`)

Automated e2e (`pnpm -C apps/web test:e2e:pwa`) covers offline cold start and
the no-cached-API rule against the production build in Chromium. Install UX is
browser-manual; checklist for the deploy verification pass:

### Chromium desktop (Chrome/Edge ≥ recent)

1. Open the deployed app, wait for full boot (guest badge / dashboard).
2. DevTools → Application → Manifest: no errors; name "Expense Tracker",
   standalone display, theme `#6366f1`, icons incl. maskable listed.
3. DevTools → Application → Service workers: one activated worker (`sw.js`),
   no redundant workers after a second deploy.
4. Install via the address-bar install icon (or ⋮ → "Install app…"):
   opens in its own window without browser chrome, correct icon.
5. Offline check: DevTools → Network → Offline, then reload the installed
   app — the shell boots and local data renders (same flow as the e2e spec).
6. Update check: deploy a new build, reload the app — the
   «Доступно обновление» toast appears; the app does NOT reload by itself;
   pressing «Обновить» activates the new version.

### iOS Safari ("На экран Домой")

1. Open the deployed app in Safari (HTTPS, iOS ≥ 17 for OPFS).
2. Share sheet → «На экран Домой» → Add: RU title «Expense Tracker» (per
   manifest `name`), icon from the manifest.
3. Launch from the home screen: opens standalone (no Safari chrome), correct
   theme background on the launch splash.
4. Airplane mode → cold start the installed app: shell boots, local data
   renders from SQLite-WASM/OPFS.
5. Storage eviction sanity: after a few days of use, confirm data persists
   (the app requests `navigator.storage.persist()` at boot).

## Apply notes

- The PWA e2e specs live in `e2e/pwa/` with their own
  `playwright.pwa.config.ts` (`pnpm test:e2e:pwa`): the service worker only
  exists in production builds, so the default dev-server suite excludes them
  (`testIgnore: '**/pwa/**'`).
- The default dev-server e2e suites pin the stored locale to EN via
  `localStorage` init scripts — their copy assertions are English while the
  product default (and the PWA suite's assertions) are RU per `web-locales`.
  In `sync-backend.spec.ts` the pin is added inside each test body after the
  env-gated `test.skip()`: a `beforeEach` hook raced the body-level skip
  teardown on Firefox ("Test ended." flakes).
- Web unit tests likewise pin EN via the shared vitest `setup.ts` (component
  tests assert English copy; dedicated tests cover the RU default,
  persistence, and immediate switching).
- Manifest theme/background colors (`#6366f1` / `#ffffff`) mirror the light
  `--primary` / `--background` design tokens; synced by review (the tokens
  package is css — no build step added, design D3).
- The settings→i18n locale sync moved from an inline `main.ts` watch into
  `app/setup-i18n-locale-watcher.ts` (behavior-preserving; one owner for
  locale plumbing, unit-testable).
- EN key completion (task 3.2): the catalogs were already at full parity
  (403 keys each, verified by the strict i18n lint and the new key-parity
  test); the change adds `common.updateAvailable` / `common.updateNow` for
  the update toast.
- Gate deviation: the repo has no root `pnpm lint` script — the web lint
  gate ran as `pnpm -C apps/web lint` (oxlint + eslint), all other gates as
  written. Steiger also re-run (web quality bar): clean.
