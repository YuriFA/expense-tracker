# @expense-tracker/mobile

React Native (Expo) app for the expense tracker - the mobile twin of
`apps/web`. Bootable FSD shell consuming the shared packages
`@expense-tracker/{api,money,i18n}`.

## Stack

- **Expo** (SDK 53) + **Expo Router** (file-based routing) + TypeScript (strict)
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

Open in a development build (expo-sqlite + react-native-mmkv are native
modules, so use a dev client / `expo prebuild`, not Expo Go):

```sh
bun --filter @expense-tracker/mobile prebuild
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

## Design tokens

Tokens carry the **same oklch values** as the web design system
(`apps/web/src/style.css`), exposed as a plain JS map
(`shared/config/theme-tokens.ts`) instead of CSS custom properties. React Native
0.76+ (new architecture) parses `oklch()` strings natively.
