# Project agent memory

This backend (`backend/`) is a spec-first, layered Go API for an expense tracker,
wired to a Vue 3 frontend in `apps/web/`. The authoritative architecture is the
scout report at `/Users/yuri/web/firstmate/data/et-arch-plan/report.md` (context
only - the code is the source of truth).

## Posture

Crewmates implement to completion, not just guide. Make concrete decisions;
explain the why/tradeoff in the PR for the captain's learning. Prefer
production-grade defaults over minimal shortcuts, but avoid speculative
abstraction.

## Architecture (layered, spec-first)

- **OpenAPI is the source of truth.** The contract lives at
  `docs/api/openapi.yaml`. Change the spec FIRST, then `make gen`; never
  hand-maintain request/response structs that duplicate the spec. Lint with
  `npx @redocly/cli lint --config docs/api/redocly.yaml docs/api/openapi.yaml`.
- **Server code is generated** with `oapi-codegen` (Gin + strict-server +
  models, embedded spec). Run `make gen` after spec changes; CI runs
  `make gen-check` to reject un-regenerated/drifted code.
- **Layering is strict: transport -> service -> repository.**
  - `internal/transport/http`: gin handlers (the generated `StrictServerInterface`
    impl). Knows HTTP, gin, httperr/httpctx, cookie. No SQL, no business rules.
  - `internal/service`: business rules + authorization (userID scoping). No HTTP,
    no SQL.
  - `internal/repository`: SQL/Postgres only, no business rules.
- The authenticated `userID` is passed **explicitly** from handler to service;
  never read from a request body. Handlers get it from the auth middleware via
  the request context.

## Data

- **PostgreSQL only** (no SQLite). Driver `pgx/v5` (pgxpool); queries via `sqlc`.
- Migrations via `golang-migrate`, one sequence-numbered up/down pair per change,
  embedded in the binary (`//go:embed`). Never edit a merged migration; add a
  new one. `make migrate-up` / `make migrate-create name=...`.
- **Money is `int64` minor units** everywhere (divisor 100). Never float/decimal.
- **Timestamps are `TIMESTAMPTZ` / `time.Time`, UTC everywhere.** `time.Local =
  time.UTC` in tests.
- IDs are UUID v4 (`github.com/google/uuid`).
- **Multi-user scoping is mandatory:** every resource query includes `user_id`;
  cross-user access returns "not found" (IDOR-safe). FK references inside a
  transaction use distinct errors (`ErrTransactionAccountNotFound` ...) so the
  transport error mapper stays 1:1 (422 in a transaction vs 404 by id).
- Type/currency use `CHECK` constraints (not Postgres ENUM).

## Codegen

- `make gen` regenerates `internal/api/api.gen.go` (oapi-codegen) and
  `internal/repository/db/` (sqlc from `internal/repository/queries/*.sql` +
  `internal/repository/postgres/migrations`). `make gen-check` is the CI drift
  gate. Both generated trees are committed.

## Auth

- **Stateful sessions** (cookie `session_id`). Do NOT introduce JWT.
- Reuse `internal/auth` primitives (bcrypt, `crypto/rand` session tokens,
  SHA-256 token hashing, modulo-bias-free OTP). Never roll your own crypto.
- Fresh session id per login (session-fixation defense); sliding expiration;
  password reset revokes all sessions. The mailer is a stub interface
  (`service.Mailer`) - real email delivery is out of scope.

## Cross-cutting

- Uniform errors via `internal/transport/http/httperr` (machine `code` + human
  `message`); map domain errors to HTTP in ONE place
  (`internal/transport/http/errormap.go`).
- Logging: `log/slog`; use `logger.Error(err)` for error attrs. Request-scoped
  logging goes through the `X-Request-ID` header set by `middleware.RequestID`.
- `fmt.Errorf("%s: %w", op, err)` for wrapping with an operation tag.

## Testing

- **Service-layer tests** use in-memory fakes (`internal/service/fakes`) - fast,
  no DB. This is where business rules are tested.
- **Repository tests** use `testcontainers-go` against real `postgres:17`
  (skipped under `-test.short`). This is where SQL correctness lives.
- **Transport tests** use `httptest` + fakes; **e2e tests** (`internal/e2e`)
  drive the full stack against a Postgres container.
- Assertions with `testify`; table-driven tests; `t.Helper()` in helpers.
- Run: `go test -race ./...` (Docker needed for the repo/e2e packages, or
  `-short` to skip them).

## Lint / build

- Lint: `golangci-lint run` (config: `backend/.golangci.yml`, very strict golden
  config).
- Build: `go build ./...` from `backend/`.
- Docker image is CGO-free (`CGO_ENABLED=0`); `docker compose up` brings up
  `db` (postgres:17) + `app`.

## Shared workspace packages (`packages/*`)

Platform-agnostic TS packages consumed by every app (web now; mobile next).
They MUST stay free of DOM/Vue/browser-only APIs (only the fetch-family
`fetch`/`Request`/`Response`/`Headers`, available in browser/Node/RN, is OK).
Consumed as workspace packages by name (`@expense-tracker/{api,money,i18n}`),
resolved to source `.ts` via `exports` (no build step; `moduleResolution:
bundler`). Each has its own `tsconfig.json` + `type-check` script and must
type-check cleanly on its own.

- **`@expense-tracker/api`** (depends on `money`): generated OpenAPI types
  (`src/schema.ts`, owned here - `gen:api` regenerates from
  `docs/api/openapi.yaml`), `createApiClient({ baseUrl, fetch })` factory
  (apps supply their own base URL - no `window` in the package), error
  mapping + `setUnauthorizedHandler`, the `Repository<T,C,U>` interface +
  per-entity repository contracts (the **DI seam**), the HTTP repository
  implementations (factories take the client), and the domain models
  (account/category/transaction + normalize). Also re-exports generic helpers
  (`generateId`, `normalize`, `isIsoDateTime`, `CalendarDay`).
- **`@expense-tracker/money`** (leaf, no internal deps): minor-units money
  model (dinero.js), locale-aware `formatMoney`, currency list, unit
  conversion, and the balance calculator (generic over a minimal account
  shape, so it has no domain dependency).
- **`@expense-tracker/i18n`** (no internal deps): EN/RU message bundles,
  `MessageSchema`, locale config, and the localized default-categories seed.
  `mapCategory`/`mapCategories` take an injected `Translator` (vue-i18n `t`
  on web, react-i18next on mobile).

App-local concerns stay OUT of packages: web keeps its vue-i18n instance,
Vite base-URL resolution, localStorage repositories, Vue DI keys/composables,
and form-layer Zod schemas.

## Frontend (apps/web)

- Feature-Sliced Design (see `apps/web/docs/ARCHITECTURE.md`, including the
  Fractal FSD `pages/*/features/` extension). Steiger must stay green.
- **Spec-first:** the API contract comes from `docs/api/openapi.yaml` via
  codegen, never hand-written fetch/types. `bun run gen:api` delegates to
  `@expense-tracker/api`, which regenerates `packages/api/src/schema.ts`
  (committed) via openapi-typescript; re-run + commit after any spec change.
  The contract, client factory, error mapping, repository interfaces, and
  HTTP impls all live in the package; web only adds the Vite base-URL
  resolution (`shared/api/client.ts`). Old import paths (`@/shared/api`,
  `@/shared/lib/data`, entity `model/*`) are kept stable via thin re-export
  barrels sourced from the packages.
- **Error mapping is code-driven:** every non-2xx response is mapped to a
  `RepositoryError` (in `@expense-tracker/api`) keyed on the backend's
  `ErrorResponse.code` (e.g. `ACCOUNT_IN_USE` vs `TRANSACTION_VERSION_CONFLICT`
  vs `USER_ALREADY_EXISTS`, all 409), not HTTP status alone.
- **Transactions:** updates are PATCH with required `version` (optimistic
  concurrency); create sends an `Idempotency-Key`; the list is cursor-paginated
  (`{transactions,nextCursor}`).
- **Auth:** stateful session cookie (no JWT). `entities/session` holds the
  typed auth API + Pinia store; the router guard bootstraps the session once and
  guards protected routes; `main.ts` wires a 401 interceptor
  (`setUnauthorizedHandler`).
- **Dev/prod default:** HTTP client with auth. `localStorage` repos are a
  dev-only opt-in (`VITE_REPO_VARIANT=localStorage`). The Vite dev/preview
  server proxies `/api` -> `localhost:8080` (same-origin cookie, no CORS).
- Quality bar: `vue-tsc --noEmit`, `oxlint`, `eslint`, `knip`, `steiger`, and
  the i18n strict lint all green. E2E (`apps/web/e2e`) drives the real backend.

## Frontend (apps/mobile)

React Native (Expo SDK 54) + Expo Router + TypeScript (strict). The mobile
"twin" of web: same domain model, design tokens, and shared packages
(`@expense-tracker/{api,money,i18n}`). Authoritative design:
`/Users/yuri/web/firstmate/data/et-mobile/design.md`. Read it before any mobile
work.

- **FSD layers** (`apps/mobile/src/`): `app -> pages -> features -> entities ->
  shared`, public-API barrels between slices. Expo Router files live in
  `app/` (auto-detected `src/app/`); route files are thin and render `pages/*`.
- **Navigation:** bottom tab bar only (Home / Transactions / Accounts /
  Settings), one level of depth; secondary actions use bottom sheets, not
  nested stacks. Safe areas + keyboard respected via `shared/ui/Screen`.
- **Design tokens** are an **rgba (sRGB) encoding** of the same palette as
  web (`shared/config/theme-tokens.ts`, a JS map) - NOT oklch, because
  `react-native-reanimated` cannot parse/interpolate `oklch()` colors; web
  keeps oklch in `apps/web/src/style.css`. Sync rule + the oklch -> sRGB -> rgba
  pipeline are documented in `theme-tokens.ts` + `global.css` headers. Theme is
  system/light/dark; `useTokens()`/`useTheme()` from `shared/ui/theme`. Outfit
  font via `@expo-google-fonts/outfit`.
- **Design-system foundation: react-native-reusables + nativewind v4**
  (JS-only; no native deps, so no pod/rebuild needed). Wiring: `babel.config.js`
  (`jsxImportSource: 'nativewind'` + `nativewind/babel`), `metro.config.js`
  (`withNativeWind`, `inlineRem: 16`), `tailwind.config.js` (`darkMode: 'class'`,
  `presets: [nativewind/preset]`, colors mapped to raw `var(--x)`), and
  `global.css` (the rgba CSS vars - the sRGB encoding of web's oklch).
  Component variants use `cva`; classes compose via `cn()` (`shared/lib/cn.ts`).
  **Theme invariant:** colors stay token-driven via `useTokens()` (synchronous,
  MMKV-backed), NOT nativewind color classes - `ThemeProvider` paints the `dark`
  class on the root View from the resolved preference so the persisted theme is
  correct on first paint. Do NOT move colors to nativewind `bg-*`/`text-*`
  classes without first proving dark mode end-to-end (nativewind's CSS-var
  cascade follows its own global colorScheme observable, and the iOS sim
  `appearance dark` does not propagate to RN's `Appearance` - verify dark via
  the in-app Settings toggle, not `xcrun simctl ui appearance`).
- **Data:** TanStack Query (React Query) with optimistic update + invalidation
  in `entities/*/model/use-*.ts`. Repository **interfaces** come from
  `@expense-tracker/api`; mobile adds **local SQLite impls**
  (`entities/*/api/sqlite-*-repository.ts`) wired via React context DI
  (`app/providers/RepositoryProvider`).
- **Persistence (offline-first, default):** domain (accounts/categories/
  transactions) in **expo-sqlite** (`shared/services/database.ts`, schema +
  default-category seeding + a single localized starter account so the input
  flow works on first launch); settings (locale/currency/theme) in **MMKV**
  (`shared/services/storage.ts` + `shared/store/use-settings-store.ts`, zustand).
  The HTTP impls from the package stay the swappable DI alternative.
- **Settings hydrate synchronously:** MMKV is read into the zustand store's
  *initial* state (not a post-commit effect), so the persisted locale/currency/
  theme are correct on first paint AND already in place when the SQLite seed
  runs. Do NOT regress this to an async effect (it reintroduces a cold-start
  theme/locale flash + a wrong-currency seed account).
- **Category CRUD:** the entity layer (SQLite repo + TanStack hooks) is in
  `@expense-tracker/api`/`entities/category`; the management UI lives in
  `pages/settings/features/category-manage` (Fractal FSD, reached from Settings
  since the design's 4-tab structure has no Categories tab). The web twin has
  the data layer but no management UI; mobile surfaces one for MVP completeness
  (design section 13).
- **Money** is shared `@expense-tracker/money` minor units; amounts render with
  `tabular` figures (`shared/lib/format.ts`). i18n is react-i18next over the
  shared bundles, runtime switching via the settings store (no restart).
- **Formatting is Intl-free (Hermes-safe):** Hermes ships without full ICU/`Intl`
  (`formatToParts`, `currencyDisplay: 'narrowSymbol'`, `Intl.DateTimeFormat`,
  and `Intl.DisplayNames` all throw), and the `@formatjs` polyfill itself
  crashed on import (taking down the whole app bootstrap), so all money and
  date formatting is deterministic and Intl-free. `packages/money`
  `formatMoney` shapes the dinero `toDecimal` value by hand per locale (en/ru);
  `apps/mobile/src/shared/lib/format.ts` carries the static currency-symbol /
  currency-name maps and the manual en/ru `formatDate`/`formatHeaderDate`
  formatters. Do NOT re-introduce `Intl`/`toLocaleDateString`/`@formatjs` in
  mobile or in the shared money package.
- **UI kit + canonical components:** one component vocabulary in `shared/ui`
  (`Screen` keyboard-aware safe-area foundation, `Button`, `TextField`,
  `SegmentedControl`, `Chip`, `AmountField` currency+numeric hero/field input,
  `PickerButton` tappable field that opens a picker, `DateCarousel`
  reanimated-backed horizontal day strip, `SwipeableRow` left-swipe actions,
  `BottomSheet`, `Skeleton`/`EmptyState`/`ErrorState` states); entity-specific
  display in `entities/*/ui` (`AccountChips`, `CategoryGrid`,
  `CategoryPickerSheet`, `AccountPickerSheet`, `TransactionListItem`). The Home
  screen (`pages/home`) IS the input screen: a focused, **non-scrolling**
  Mibu-style layout (date carousel at top -> type switch -> hero amount as the
  flex centerpiece -> account/category `PickerButton`s that open bottom-sheet
  pickers -> pinned Save) that fits one viewport with the keypad up. It sets the
  serial-entry pattern (autofocus amount, pinned save, optimistic create; on
  save the amount clears AND the date resets to today). The date carousel drives
  `occurredAt` (selected calendar day + current time-of-day, in
  `model/use-transaction-form`); the recent-transactions list + balance header
  moved off Home to the Transactions/Accounts tabs to satisfy the no-scroll
  constraint. Amount parse/sanitize helpers are in `shared/lib/amount.ts`, the
  calendar-day helpers in `shared/lib/date.ts`, the edit sheet in
  `features/transaction/edit`. The Transactions screen (`pages/transactions`) is
  the reference for the full-history **virtualized list** (`FlatList`) +
  **live-filter `BottomSheet`** (type/account/category/date-range preset) +
  active-filter `Chip` rail + swipe delete / tap-to-edit; its
  `model/use-transaction-filters` derives the repository `TransactionQuery` and
  `lib/date-range.ts` resolves the presets.
- **Native modules** (expo-sqlite, react-native-mmkv, react-native-reanimated,
  expo-haptics) require a dev build / `expo prebuild`, not Expo Go.
  **react-native-mmkv 3 + react-native-reanimated 4 require the New
  Architecture** (TurboModules); without it the app red-boxes at boot. New Arch
  is on via `expo.newArchEnabled: true` in `app.json` (also the SDK 54 / RN 0.81
  default); keep it on, do not downgrade mmkv/reanimated to dodge it. A Maestro
  launch-smoke flow (`apps/mobile/.maestro/launch.yaml`, `bun run test:e2e`)
  cold-boots and asserts the Home input screen, so boot-time crashes fail CI;
  `add-transaction.yaml` guards the create path (enter amount -> Save -> kill ->
  relaunch -> persisted). Maestro 2.x needs **Java 17+** on PATH
  (`JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`).
  Quality bar: `tsc --noEmit` clean, `expo-doctor` no new regressions (the repo
  has 2 pre-existing failures: bun `node_modules` duplicates + the committed
  `ios/`/`android` non-CNG warning), `expo export --platform ios` bundles.
- **Forms: react-hook-form + @hookform/resolvers (zodResolver).** Every submit
  form (`AddAccountSheet`, `EditAccountSheet`, `CategoryFormSheet`,
  `TransactionEditSheet`, and the Home `use-transaction-form` hook) uses
  `useForm` + `Controller`; zod schemas live in each slice's
  `model/form-schema.ts`. Money fields are validated as the raw editable string
  and parsed to minor units in the submit handler (no zod `.transform` - it
  splits input/output typing against RHF `defaultValues`). **Never** push
  `version` into a create payload (the `transactions.version` NOT NULL fix);
  `UpdateTransactionPayload` carries `version` from the loaded record at submit.
- **Accessibility primitives:** Reduce Motion is read via the shared
  `useReduceMotion()` hook (`shared/lib/reduce-motion.ts`) - animate
  accordingly (skeleton pulse, sheet slide). Haptics (`shared/lib/haptics.ts`,
  via `expo-haptics` `UIFeedbackGenerator`) are OS-gated: iOS suppresses them
  under the system "System Haptics" toggle and Android under its touch-feedback
  setting, so there is no app-level haptics toggle. Token contrast was verified
  WCAG-AA (body >=4.5:1) in both themes.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
