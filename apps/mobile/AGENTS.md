# Mobile (`apps/mobile/`) - agent memory

React Native + Expo (**SDK 54** / RN 0.81 / React 19.1). Workspace member
`@expense-tracker/mobile`, the "twin" of `apps/web` - shares the domain model and
the `@expense-tracker/{api,money,i18n}` packages. Project-wide invariants live in
the root `AGENTS.md`.

> **Why SDK 54, not newer:** NativeWind v4 (`react-native-css-interop`) relies on
> `babel-preset-expo` receiving `jsxImportSource: "nativewind"`. On SDK 55+ the
> Expo metro babel-transformer loads `babel.config.js` via `extends` +
> `configFile:false`, which silently drops that preset option - JSX compiles to
> `react/jsx-runtime`, `className` is ignored, and NativeWind styling does nothing
> (no error). NativeWind v4 + Expo SDK 54 is the officially recommended stable
> combo (see nativewind/nativewind discussion #1604). Do NOT bump to SDK 55+
> without first verifying `jsxImportSource` still reaches the preset (check the
> bundle uses `react-native-css-interop/jsx-runtime`, not `react/jsx-runtime`).

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
Route files are thin - they only re-export the screen:

```ts
export { DashboardScreen as default } from '@/pages/dashboard'
```

**`@/*` → `./src/*`** via tsconfig `paths`; Metro resolves it (no babel path config
needed). There **is** a `babel.config.js` - it is required for NativeWind v4
(`jsxImportSource: "nativewind"` + the `nativewind/babel` preset drive
`className` -> style resolution; without them NativeWind styling is a no-op).
`babel-preset-expo` (SDK 54) auto-adds the `react-native-worklets/plugin` when
worklets/reanimated is installed, so do NOT list it explicitly. Under jest
(`JEST_WORKER_ID`) the config drops NativeWind and compiles plain React JSX
(`className` is an ignored prop, `react-native-reanimated` is mocked in
`jest.setup.js`) - see the unit-testing section below.

## Routes

Route groups (`(auth)`, `(tabs)`) organize the navigator without touching URLs.
Root `/` resolves to `(tabs)/index` (Dashboard). The web router guard (unauthed →
login, authed redirected away from login) is **not yet ported**.

| Route file | URL | Tab |
| --- | --- | --- |
| `(tabs)/index.tsx` | `/` | Dashboard |
| `(tabs)/transactions.tsx` | `/transactions` | Transactions |
| `(tabs)/accounts.tsx` | `/accounts` | Accounts |
| `(tabs)/settings.tsx` | `/settings` | Settings |
| `(auth)/{login,register,verify-email,reset-password}.tsx` | `/...` | - |

**Bottom tab bar** uses expo-router's headless tab components
(`expo-router/ui`: `Tabs`/`TabSlot`/`TabList`/`TabTrigger`), not the default. The
hidden `<TabList>` declares the routes, `<TabSlot>` renders the focused screen,
and the custom `widgets/bottom-tab-bar/` renders the 4 real tabs + a central
spacer; each tab button reads its focus/press state from `useTabTrigger(name)`.
The central `+` is a **SpeedDial** overlay (`shared/ui/SpeedDial`,
`position="center"`) mounted as a **sibling** of `<Tabs>` in
`(tabs)/_layout.tsx` - a global floating action, NOT a route and NOT a tab
(opening it never changes the active route). Actions (Expense/Income/Transfer)
are wired in that layout; their create-transaction flows don't exist yet
(placeholder callbacks). The active tab tint comes from the `primary` token.
The FAB straddles the bar's top edge via `bottomOffset = measuredBarHeight -
FAB_SIZE/2` (height shared via `widgets/bottom-tab-bar` `TabBarHeightProvider`,
not hardcoded).

## Conventions

- **Component files are PascalCase** (`DashboardScreen.tsx`) - matches `apps/web`
  and React Native norms; route/layout files stay lowercase per expo-router.
- **i18n** will use the shared `@expense-tracker/i18n` bundle via react-i18next
  (mobile keeps its own native wiring, like web keeps vue-i18n). Strings in the
  skeleton are placeholders; tab titles live in `(tabs)/_layout.tsx`.
- **Money / auth / errors** invariants (int64 minor units, stateful session
  cookie, `code`-keyed `RepositoryError`) come from the root `AGENTS.md` and the
  shared `api` package - apply them as features land.

## Quality bar

`pnpm type-check` (`tsc --noEmit`) stays green. The iOS production bundle
(`pnpm exec expo export --platform ios`) is the end-to-end check that `@/*` and the
route tree resolve. Run: `pnpm start` (`expo start`), `ios`, `android`, `web`.

## Unit/component tests (jest)

`pnpm test` runs jest (`jest-expo` preset + `@testing-library/react-native`;
config + `jest.setup.js` at the app root). Because NativeWind v4's JSX wrapping
and the worklet runtime don't run under jest, `jest.setup.js` mocks
`react-native-reanimated` (synchronous JS) and `@expo/vector-icons` (async font
load), and `babel.config.js` skips NativeWind under `JEST_WORKER_ID` - so assert
**observable behavior** (a11y state, callbacks, testID presence), never animation
frames. Co-locate `*.test.tsx` next to the component (twin of `apps/web`).
Components using `useSafeAreaInsets`/`useTheme` need `SafeAreaProvider` (with
`initialMetrics`) + `ThemeProvider` in the test render.

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

The app is a skeleton: screens are placeholders, `entities/`, `features/`, and
most of `shared/` are empty. Open decisions before the first real feature:

- **Session gate** in `src/app/_layout.tsx` (port the web router guard;
  needs `entities/session` + an unauthorized interceptor).
- **Persistence & data fetching.** Not yet built. When it lands, modules
  outside Expo Go (e.g. react-native-mmkv, SQLite, custom native code) require a
  **dev build** and also flip the Maestro e2e target off Expo Go (see
  "Testing / e2e" above - the prior `.pi/skills/maestro` note referencing that
  skill was stale; `.pi/` does not exist in this repo).
- **i18n wiring** (`shared/i18n` + react-i18next) and localized tab/screen titles.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
