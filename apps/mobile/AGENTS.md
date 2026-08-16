# Mobile (`apps/mobile/`) - agent memory

React Native + Expo (**SDK 54** / RN 0.81 / React 19.1). Workspace member
`@expense-tracker/mobile`, the "twin" of `apps/web` - shares the domain model and
the `@expense-tracker/{api,money,i18n}` packages. Project-wide invariants live in
the root `AGENTS.md`.

## Architecture: FSD + Expo Router

Feature-Sliced Design like `apps/web`, with one adaptation: **Expo Router reserves
`src/app/` for routes**, so the FSD `app/` layer is routes-only and the app-level
initialization that lived in `app/` on web moves into the root `_layout.tsx`.

```
src/
├── app/            Expo Router routes ONLY - every file is a route
│   ├── _layout.tsx     root: providers (SafeArea, GestureHandler, StatusBar) + Stack
│   ├── (auth)/         unauthenticated flows, no tab bar
│   └── (tabs)/         bottom-tab navigator - twin of the web top nav
├── pages/          screen bodies each route renders (index.ts barrel + ui/)
├── features/       global reusable features (2+ consumers)
├── entities/       domain models (account/category/transaction/session)
└── shared/         infrastructure: ui/, lib/, api/, config/, i18n/
```

**Import direction is strictly downward**, identical to web:
`app → pages → features → entities → shared`. Each slice exports through an
`index.ts` barrel; cross-imports between slices of the same layer are forbidden.
There is deliberately NO segment-level `shared/ui/index.ts` aggregate - import
each component from its slice (`@/shared/ui/button`, `@/shared/ui/text`, ...).
Route files are thin - they only re-export the screen:

```ts
export { DashboardScreen as default } from '@/pages/dashboard'
```

**`@/*` → `./src/*`** via tsconfig `paths`; Metro resolves it (no babel path config
needed). Styling is **Uniwind** (Tailwind CSS v4, CSS-first) - there is no
`tailwind.config.*`. `global.css` is a THIN entry: framework imports
(`tailwindcss`, `uniwind`) plus `@import '@expense-tracker/tokens/mobile'`,
which carries all design tokens (the mobile copy of the shared palette; the
web copy is `packages/tokens/src/index.css` - keep the two in sync by hand,
same sRGB hex, no oklch/conversion). Every color must
be a token: a class (`bg-card`), an `accent-*` class on a `{prop}ClassName` prop
for non-style color props (`Icon colorClassName="accent-primary"`), or a
COMPLETE class string stored in data (e.g. a mock category's
`'bg-brand-violet'`); raw hex/rgb in `src/` fails the `design-tokens-guard`
jest test. `className` -> style resolution runs in Metro
(`withUniwindConfig` in `metro.config.js`, with `polyfills.rem: 14` to keep
NativeWind-era spacing); no babel preset/plugin is involved, so `babel.config.js`
is just `babel-preset-expo` (which auto-adds `react-native-worklets/plugin` when
reanimated is installed - do NOT list it explicitly). `uniwind-types.d.ts` is
generated (CLI `uniwind generate-artifacts --css ./global.css` or any metro run)
and committed - keep it in tsconfig `include`. Under jest `className` is a plain
ignored prop (`react-native-reanimated` and `withUniwind` are mocked in
`jest.setup.js`) - see the
unit-testing section below.

## Routes & tab bar

Route groups (`(auth)`, `(tabs)`) organize the navigator without touching URLs;
root `/` resolves to `(tabs)/index` (Dashboard). The web router guard (unauthed
-> login, authed redirected away) is **not yet ported**.

The bottom tab bar is built on expo-router's **headless** tab components
(`expo-router/ui`: `Tabs`/`TabSlot`/`TabList`/`TabTrigger`), not the default
`@react-navigation/bottom-tabs`. The custom `widgets/bottom-tab-bar/` renders the
4 real tabs + a central spacer; each tab reads focus/press state from
`useTabTrigger(name)`.

The central `+` is a **SpeedDial** overlay (`shared/ui/speed-dial`) mounted as a
**sibling** of `<Tabs>` in `(tabs)/_layout.tsx` - a global floating action, NOT
a route and NOT a tab (opening it never changes the active route). SpeedDial is
purpose-built for this single use case: fully uncontrolled (internal open
state), always centered, fixed `speed-dial-*` testIDs (Maestro relies on them).
Its Expense/Income/Transfer actions are wired in that layout;
the create-transaction flows don't exist yet (placeholder callbacks). The FAB
straddles the bar's top edge via `bottomOffset = measuredBarHeight - FAB_SIZE/2`
(height shared via `widgets/bottom-tab-bar` `TabBarHeightProvider`, not
hardcoded).

## Conventions

- **Component files are kebab-case** (`dashboard-screen.tsx`), like `bottom-sheet/`;
  the exported component identifiers stay PascalCase (`DashboardScreen`) for JSX.
  Route/layout files stay lowercase per expo-router.
- **i18n** will use the shared `@expense-tracker/i18n` bundle via react-i18next
  (mobile keeps its own native wiring, like web keeps vue-i18n). Strings in the
  skeleton are placeholders; tab titles live in `(tabs)/_layout.tsx`.
- **Money / auth / errors** invariants (int64 minor units, stateful session
  cookie, `code`-keyed `RepositoryError`) come from the root `AGENTS.md` and the
  shared `api` package - apply them as features land.

## Quality bar

`pnpm type-check` (`tsc --noEmit`), `pnpm lint` (`oxlint . --fix`), and
`pnpm format` (`oxfmt src/`) stay green - the twin of `apps/web`'s oxlint/oxfmt
setup. Configs are `.oxlintrc.json` / `.oxfmtrc.json` (plugins swap `vue` for
`react` and `vitest` for `jest`; same `correctness: error` bar, same
`semi: false` / `singleQuote: true` style). There is **no eslint** on mobile
today - oxlint is the only linter. `pnpm knip` from the **workspace root**
covers mobile (config in the root `knip.json`; Expo plugin traces `src/app/**`
routes, `.maestro/_launch.js` is a knip entry). The iOS production bundle
(`pnpm exec expo export --platform ios`) is the end-to-end check that `@/*` and the
route tree resolve. Run: `pnpm start` (`expo start`), `ios`, `android`, `web`.

## Unit/component tests (jest)

`pnpm test` runs jest (`jest-expo` preset + `@testing-library/react-native`;
config + `jest.setup.js` at the app root). Because Uniwind's style resolution
runs in Metro and the worklet runtime doesn't run under jest,
`jest.setup.js` mocks `react-native-reanimated` (synchronous JS) and
`@expo/vector-icons` (async font load); `jest.config.js` adds `uniwind`
(and `culori`) to the babel transform allowlist - so assert **observable
behavior** (a11y state, callbacks, testID presence), never animation frames or
computed `className` styles. Co-locate `*.test.tsx` next to the component (twin
of `apps/web`). Components using `useSafeAreaInsets` need `SafeAreaProvider`
(with `initialMetrics`) in the test render; `ThemeProvider` in the wrapper is
still the convention for screens.

## Testing / e2e (Maestro)

Flows live in `.maestro/flows/*.yaml`; shared launch logic in
`.maestro/_launch.yaml` (+ `_launch.js`); config in `.maestro/config.yaml`.

**Target: Expo Go (iOS).** Flows deep-link into the running dev server
(`host.exp.Exponent` -> `exp://127.0.0.1:<port>`), so the suite needs no native
build while the app only uses modules shipped with Expo Go. This is the
lightest path that works against the current skeleton. The committed `appId`
(`host.exp.Exponent`, capital E) is the iOS Expo Go bundle id; Android Expo Go's
package is `host.exp.exponent` (lowercase), so the suite is iOS-only today and
needs its own launch handling before Android can run it.

Two rules every agent MUST follow here:

- **Add coverage for new use cases.** Landing or changing a user-facing flow in
  `apps/mobile` REQUIRES adding (or updating) a Maestro flow covering it. No new
  user-facing behavior ships without an e2e flow.
- **Run the suite green before `done`.** Before any task here reports done, run
  `pnpm test:e2e` and it must pass. A failing run blocks `done` - fix the app
  or the flow; do not skip or weaken the assertion.

**Selectors:** assert/tap by `testID` (Maestro `id`), not text. Conventions:
lowercase-kebab ids; screens carry `screen-<name>` (set on `ScreenPlaceholder`
via the spread props), tab buttons carry `tab-<name>` (via `tabBarButtonTestID`
on `(tabs)/_layout.tsx`).

**Run it** (from `apps/mobile`):

1. Boot an iOS simulator and install the matching Expo Go:
   `npx expo-go download ios <sdk>` -> `xcrun simctl install booted <Expo-Go-*.tar.app>`.
2. Start the dev server in its own terminal: `pnpm start` (Metro on :8081).
3. `pnpm test:e2e` (whole suite) or
   `maestro test .maestro/flows/<file>.yaml` (one flow).

Override the dev-server URL without editing files (e.g. port 8081 is busy):
`MAESTRO_EXPO_URL='exp://127.0.0.1:<port>' pnpm test:e2e`. Prerequisites:
Java 17+ on `PATH` and the `maestro` CLI (install per maestro.dev); a booted
simulator with Expo Go; the dev server running. Artifacts land in
`.maestro/.output/` (gitignored); flow YAML stays committed.

**New flow template** - copy `_launch.yaml`'s header, `runFlow: ../_launch.yaml`,
then the user actions and assertions:

```yaml
appId: host.exp.Exponent
---
- runFlow: ../_launch.yaml
- tapOn:
    id: <element-testid>
- assertVisible:
    id: <expected-testid>
```

**Switching off Expo Go:** when a feature needs native code not bundled in Expo
Go (mmkv / SQLite / custom modules), add `ios.bundleIdentifier` + android
`package` to `app.json`, produce a dev build, and repoint `_launch.yaml` from
the `openLink` Expo-Go path to `launchApp: <bundleId>`.

## Not yet built (re-establish here as it lands)

Open decisions before the next real feature:

- **Session gate** in `src/app/_layout.tsx` (port the web router guard;
  needs `entities/session` + an unauthorized interceptor).
- **i18n wiring** (`shared/i18n` + react-i18next) and localized tab/screen
  titles; RU strings are hardcoded with `TODO(i18n)` markers until then.
- **Sync engine** (phase 3 of the `mobile-offline-first` change): the
  outbox/conflict tables and version columns already exist; only the engine
  is missing. `@react-native-community/netinfo` is installed for it.

## Local data layer (landed)

Offline-first foundation per the `mobile-offline-first` change (phase 1):
`shared/lib/db` (expo-sqlite + drizzle, migrations via `pnpm db:generate`,
transactional outbox writes, D5 version transitions in `outbox.ts`),
`entities/*/api/local-repository.ts` (backend-mirroring rules and error
codes), TanStack Query hooks in `entities/*/model/`, and DI via
`entities/*/api/repository.tsx` providers mounted in the root `_layout`.
Repository unit tests run SQLite for real through the `node:sqlite` adapter
in `shared/lib/db/testing` (never import it from app code). Known e2e gap:
`TODO(sheet-e2e)` in `shared/ui/bottom-sheet` - typing into sheet inputs is
unstable under Expo Go Maestro (inputs invisible in modal AX trees +
keyboard-lift geometry); the data-creating flows in `.maestro/flows/05-08*`
are annotated known-failing until that lands.
