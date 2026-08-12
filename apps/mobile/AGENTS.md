# Mobile (`apps/mobile/`) - agent memory

React Native + Expo (SDK 57 / RN 0.86 / React 19.2). Workspace member
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
Route files are thin - they only re-export the screen:

```ts
export { DashboardScreen as default } from '@/pages/dashboard'
```

**`@/*` → `./src/*`** via tsconfig `paths`; Metro resolves it through the default
`babel-preset-expo` - **no `babel.config.js`** (one was tried and fails to resolve
`babel-preset-expo` in the bun `.bun` layout; the project default works).

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

`bun run type-check` (`tsc --noEmit`) stays green. The iOS production bundle
(`bunx expo export --platform ios`) is the end-to-end check that `@/*` and the
route tree resolve. Run: `bun run start` (`expo start`), `ios`, `android`, `web`.

## Not yet built (re-establish here as it lands)

The app is a skeleton: screens are placeholders, `entities/`, `features/`, and
most of `shared/` are empty. Open decisions before the first real feature:

- **Session gate** in `src/app/_layout.tsx` (port the web router guard;
  needs `entities/session` + an unauthorized interceptor).
- **Persistence & data fetching.** The `.pi/skills/maestro` skill references
  react-native-mmkv 3 + a SQLite store, `appId works.earendil.expensetracker`,
  and `expo.newArchEnabled: true` - none of which exist in code yet. **Reconcile
  whether that skill is the target or stale before building native**; those deps
  require a dev build (not Expo Go).
- **i18n wiring** (`shared/i18n` + react-i18next) and localized tab/screen titles.
