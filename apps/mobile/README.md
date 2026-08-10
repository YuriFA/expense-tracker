# @expense-tracker/mobile

React Native (Expo) app for the expense tracker - the mobile twin of
`apps/web`. Bootable FSD shell consuming the shared packages
`@expense-tracker/{api,money,i18n}`.

## Stack

- **Expo** (SDK 54) + **Expo Router** (file-based routing) + TypeScript (strict)
- **TanStack Query** (React Query) for the data layer (optimistic update + invalidation)
- **react-i18next** over the shared message bundles (EN/RU), runtime switching
- **zustand** + **MMKV** for settings persistence
- **expo-sqlite** for the relational domain store (accounts / categories / transactions)
- **Outfit** typeface (400/500/600/700) via `@expo-google-fonts/outfit`

## Run

```sh
# from the repo root
bun install
bun --filter @expense-tracker/mobile dev        # expo start
bun --filter @expense-tracker/mobile type-check # tsc --noEmit
```

Open in a development build. Several deps are native modules that need a
prebuilt dev client, not Expo Go: `expo-sqlite`, `react-native-mmkv` (v3), and
`react-native-reanimated` (v4). The latter two require the **New Architecture**
(TurboModules); without it the app red-boxes at boot (`react-native-mmkv 3.x.x
requires TurboModules, but the new architecture is not enabled!`). New Arch is
enabled via `expo.newArchEnabled: true` in `app.json` (also the SDK 54 / RN 0.81
default) and is verified at prebuild (`RCT_NEW_ARCH_ENABLED` lands in the iOS
Pods build flags and `newArchEnabled=true` in `android/gradle.properties`). Keep
it on; do not downgrade mmkv/reanimated to dodge it.

```sh
bun --filter @expense-tracker/mobile prebuild
```

Then build + install the dev client on a booted simulator/emulator, e.g.:

```sh
# iOS (from apps/mobile, after prebuild)
npx expo run:ios
# Android
npx expo run:android
```

## Structure (Feature-Sliced Design)

```
src/
  app/        init, providers, Expo Router root + tabs, theme wiring
  pages/      route-level screens (fractal features later)
  features/   global reusable features (reserved - none yet for the shell)
  entities/   account / category / transaction (consume @expense-tracker/*)
  shared/     ui-kit, lib, services (db + storage), store, config
```

Imports flow strictly downward: `app -> pages -> features -> entities -> shared`,
with public-API barrels (`index.ts`) between slices.

## Persistence (offline-first)

Per the mobile design (section 10), local persistence is the default and works
with no network:

- **Domain (accounts / categories / transactions): SQLite** via `expo-sqlite`.
  Relational, referentially-consistent, queryable (the Transactions list filters
  + cursor pagination are real SQL). Rows map to/from the shared domain types and
  balances use the shared integer money calculator.
- **Settings (locale / currency / theme): MMKV** (`react-native-mmkv`),
  synchronous so the persisted theme + locale apply before the first paint.

The repository **interfaces** come from `@expense-tracker/api`; this app adds the
local SQLite implementations and wires them through DI (React context). The HTTP
implementations from the package remain the swappable alternative behind the same
seam.

## Testing (E2E launch smoke)

A [Maestro](https://maestro.mobile.dev/) launch-smoke flow lives under
[`.maestro/`](./.maestro). It cold-boots the app (`clearState`) and asserts the
Home input screen mounted (type switch + Save button + the hero amount field),
which fails automatically on any launch-time crash - the class of bug it was
added for: a New-Architecture-only native dep red-boxing at boot.

Prerequisites: a **booted iOS simulator or Android emulator**, the **dev build
installed** (see Run above), and the **`maestro` CLI** on PATH ([install](https://maestro.mobile.dev/getting-started/installing-maestro)).

```sh
# from the repo root (or apps/mobile)
bun --filter @expense-tracker/mobile test:e2e   # maestro test .maestro/
```

Add more flows (e.g. the enter-transaction happy path) as additional
`.maestro/*.yaml` files; `test:e2e` runs the whole directory.

## Design tokens

Tokens carry the **same oklch values** as the web design system
(`apps/web/src/style.css`), exposed as a plain JS map
(`shared/config/theme-tokens.ts`) instead of CSS custom properties. React Native
0.76+ (new architecture) parses `oklch()` strings natively.
