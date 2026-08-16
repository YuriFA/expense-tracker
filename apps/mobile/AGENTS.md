# Mobile (`apps/mobile/`) — agent memory

React Native + Expo (SDK 54 / RN 0.81 / React 19.1). Workspace member `@expense-tracker/mobile`, twin of `apps/web` — shares the domain model and `@expense-tracker/{api,money,i18n}` packages. Project-wide invariants live in the root `AGENTS.md`.

## Architecture: FSD + Expo Router

Feature-Sliced Design like `apps/web`, with one adaptation: Expo Router reserves `src/app/` for routes, so the FSD `app/` layer is routes-only; app-level initialization that lived in `app/` on web moves into the root `_layout.tsx`.

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

Import direction is strictly downward, identical to web: `app → pages → features → entities → shared`. Each slice exports through an `index.ts` barrel; cross-imports between slices of the same layer are forbidden.

There is deliberately no segment-level `shared/ui/index.ts` aggregate — import each component from its slice (e.g. `@/shared/ui/button`, `@/shared/ui/text`).

Route files are thin — they only re-export the screen:
```ts
export { DashboardScreen as default } from '@/pages/dashboard'
```
Screen-specific UI belongs under `pages/<page>`. A component used by exactly one screen should normally stay close to that screen rather than being prematurely promoted to `features`/`shared`; promote only on genuine reuse or a meaningful cross-screen concept.

## Routes & tab bar

Route groups `(auth)` and `(tabs)` organize the navigator without touching URLs. Root `/` resolves to `(tabs)/index` (Dashboard). The web router guard (unauthed → login, authed redirected away) is not yet ported.

The bottom tab bar is built on expo-router's headless tab components (`expo-router/ui`: `Tabs`/`TabSlot`/`TabList`/`TabTrigger`), not `@react-navigation/bottom-tabs`. The custom `widgets/bottom-tab-bar/` renders the 4 real tabs + a central spacer; each tab reads focus/press state from `useTabTrigger(name)`.

The central `+` is a SpeedDial overlay (`shared/ui/speed-dial`) mounted as a sibling of `<Tabs>` in `(tabs)/_layout.tsx` — a global floating action, not a route and not a tab. It's fully uncontrolled (internal open state), always centered, with fixed `speed-dial-*` testIDs (Maestro relies on them). Its Expense/Income/Transfer actions are wired in that layout.

## Styling

Styling is Uniwind (Tailwind CSS v4, CSS-first) — no `tailwind.config.*`. `global.css` is a thin entry: framework imports (`tailwindcss`, `uniwind`) + `@import '@expense-tracker/tokens/mobile'`. The mobile and web token copies must stay manually synchronized (same sRGB hex values, no oklch/conversion).

Every color must be a token — via `className` (e.g. `bg-card`), an icon's `colorClassName`, or a complete class string stored in data (e.g. `bg-brand-violet`). Raw hex/rgb values in `src/` fail the `design-tokens-guard` Jest test.

`className` → style resolution runs in Metro (`withUniwindConfig`, with `polyfills.rem = 14` to keep NativeWind-era spacing). No Babel preset/plugin needed for Uniwind — `babel.config.js` has only `babel-preset-expo`; Expo auto-adds `react-native-worklets/plugin` for Reanimated, don't add it explicitly. `uniwind-types.d.ts` is generated and committed — keep it in tsconfig.

## Naming conventions

Component files: kebab-case (`dashboard-screen.tsx`, `new-transaction-sheet.tsx`). Exported component identifiers stay PascalCase (`DashboardScreen`, `NewTransactionSheet`). Expo Router route/layout files stay lowercase as required by Expo Router.

### `handle*` vs `on*`

Use `handle*` for functions implemented by the current component that handle
events or callbacks:

```tsx
const handleSubmit = (values: FormValues) => {}
const handlePress = () => {}
```

Use on* only for callback props exposed by a component:

```tsx
interface Props {
  onSubmit: (value: FormValues) => void
  onCancel: () => void
}
```

In short:

handle* — implementation-side function.
on* — component callback prop.

Do not name an internal handler onPress merely because it is passed to
<Button onPress={...}>.

## Forms

Forms use React Hook Form + Zod. Don't hand-roll non-trivial forms with independent `useState` per field/error/touched flag — use `useForm({ resolver: zodResolver(schema), defaultValues })` for field values, validation, touched/dirty state, submit state, and field/server errors. Plain `useState` remains right for non-form UI state: open/closed, selected view mode, animation, temporary toggles.

### Form schema location

Keep form schemas separate from form UI. Prefer
`features/<feature>/model/schema.ts` for reusable feature-level validation.
For a page-local form, co-locate the schema with the form when it has no
meaningful reuse. Infer form value types from the Zod schema instead of
duplicating them manually unless a separate type is genuinely needed.

### Form submission

`form.handleSubmit(handleSubmit)` can be passed inline to `onPress`, or extracted first as `const handleFormSubmit = form.handleSubmit(handleSubmit)`. Prefer extracting it when the submit handler is reused, passed to another component, or the inline expression makes JSX noisy. Keep the naming distinction clear — `handleSubmit` is the business-logic handler, `handleFormSubmit` is RHF's wrapped version — and don't add another `handlePress` wrapper around `form.handleSubmit(...)` unless there's real additional behavior.

### `Controller` and custom fields

Use `Controller` or `useController` for controlled/custom React Native
components that need explicit value/onChange integration with RHF.
Keep simple native inputs straightforward; don't create custom field
abstractions unless they provide real reuse or behavior.

### `FormProvider` / `useFormContext`

Direct field props are fine for small/simple forms. Prefer `FormProvider` + `useFormContext<FormValues>()` for larger forms, deeply nested custom fields, multi-section Bottom Sheet forms, or reusable field groups — not for a two-field form where direct props are already clear.

### Forms inside Bottom Sheets

A Bottom Sheet is a presentation/container component; the form stays a normal, independent form component owning its own `useForm()` — don't put all fields, validation, and submission logic directly into the Bottom Sheet container:

```tsx
function NewTransactionSheet({ ref, kind }: Props) {
  return (
    <BottomSheet ref={ref}>
      <BottomSheetHeader title="Новая транзакция" />
      <BottomSheetBody>
        <NewTransactionForm kind={kind} />
      </BottomSheetBody>
    </BottomSheet>
  )
}
```

The Bottom Sheet should own presentation concerns (ref, snap points,
dismissal, header, container layout). The form should own field state,
validation, submission, and form-level errors.

Don't assume changing the sheet's `kind` or reopening it resets form state automatically — the form must define its own lifecycle explicitly (e.g. `useEffect(() => form.reset(defaultValues), [defaultValues, form])`, or a remount/key strategy when that's clearer). Resetting should be deliberate and tied to the actual flow lifecycle.

## Component design

Prefer a single clear responsibility per component — it shouldn't simultaneously be a Bottom Sheet container, a full form implementation, a domain validation engine, an API/repository adapter, and a large collection of presentation primitives. Split container (`new-transaction-sheet.tsx`) from presentation/form (`new-transaction-form.tsx`) once a component gets non-trivial — but don't split trivial code into many files just to satisfy the rule.

Prefer deriving values (e.g. `accounts.find(a => a.id === selectedAccountId)`) over duplicating them in a parallel `useState`, unless there's a genuine independent state transition. Don't use `useEffect` as a stand-in for ordinary derived values or event handling — compute derived booleans/values directly instead of syncing them into state via an effect. Effects are for synchronization with external systems or lifecycle operations, not basic computation.

## State management

Use the smallest appropriate mechanism: React Hook Form for form state, TanStack Query for server/repository state and async mutations, plain React state for local ephemeral UI state, Zustand/MobX only for shared client-only UI state that genuinely needs global ownership, and the repository layer for persistent local domain data. Don't duplicate server/local repository state into global client state without a concrete reason, and don't reach for Zustand/MobX just because several components need to read data TanStack Query already owns.

## Repository / data layer

Offline-first data access goes through repositories and TanStack Query hooks — UI components must not touch SQLite/Drizzle or backend clients directly:

```
UI → TanStack Query hook → Repository → Local DB / remote API
```

Domain/repository errors use the shared `RepositoryError` model and existing error-code mappings — don't invent ad-hoc error strings in individual screens when a shared mapping exists.

Money values use int64 minor units — never floating-point for persisted monetary values.

## i18n

Will use the shared `@expense-tracker/i18n` bundle via react-i18next; mobile keeps its own native wiring, like web keeps vue-i18n. Until that wiring lands, RU strings may stay hardcoded with explicit `TODO(i18n)` markers. Don't introduce a second ad-hoc translation mechanism.

## Testing

`pnpm test` runs Jest (`jest-expo` + `@testing-library/react-native`). Test observable behavior (e.g. `getByTestId('submit')` is enabled/disabled), not internal state, computed Uniwind styles, animation frames, or private function calls (unless mocking a genuine external boundary). Components using `useSafeAreaInsets` need `SafeAreaProvider` with `initialMetrics` in tests; wrap screens in `ThemeProvider`. Co-locate tests next to the component (`new-transaction-form.tsx` + `.test.tsx`).

Form tests should cover: invalid input blocks submission; valid input submits the expected values; validation errors are visible; server/repository errors surface; loading state prevents duplicate submission; conditional fields appear/disappear correctly; reset behavior works where the flow requires it. Don't test RHF internals.

## E2E / Maestro

Flows live in `.maestro/flows/*.yaml`; shared launch logic is `.maestro/_launch.yaml` + `.maestro/_launch.js`. Every new user-facing flow requires Maestro coverage — no new user-facing behavior ships without one. Selectors use `testID`/Maestro `id` (lowercase-kebab, e.g. `screen-dashboard`, `tab-dashboard`, `new-transaction-submit`), not visible text.

New flow template:
```yaml
appId: com.anonymous.mobile
---
- runFlow: ../_launch.yaml
- tapOn:
    id: <element-testid>
- assertVisible:
    id: <expected-testid>
```

Before reporting a task done, `pnpm test:e2e` must pass — a failing run blocks `done`; don't skip or weaken assertions to make the suite green.

## Dev build target (was: Expo Go)

Target: a local iOS dev build (`com.anonymous.mobile` + `expo-dev-client`). The suite moved off Expo Go when background sync landed — `expo-background-fetch`/`expo-task-manager` OS scheduling is not guaranteed inside Expo Go. Produce/update the dev build with `pnpm ios` (`npx expo run:ios`; `ios/`/`android/` are gitignored and config-synced from `app.json`, incl. the `expo-background-fetch` plugin's `UIBackgroundModes`). Metro must be running (default 8081): flows deep-link the dev client into it via `exp+expensetracker://expo-development-client/?url=…` (see `_launch.yaml`/`_launch.js`, overridable via `MAESTRO_EXPO_URL`).

Known limitation carried over: typing into Bottom Sheet inputs is unstable (inputs can be missing from the modal a11y tree, keyboard-lift geometry is unstable) — tracked as `TODO(sheet-e2e)`; don't silently remove or weaken this.

## Quality bar

Before reporting a task complete, run the checks relevant to the change:
```bash
pnpm type-check
pnpm lint
pnpm format
pnpm test
pnpm test:e2e
```
`pnpm knip` from the workspace root covers mobile. `pnpm exec expo export --platform ios` is an additional end-to-end check on the iOS production bundle.

Known failures documented in this file (for example `TODO(sheet-e2e)`) are
not considered regressions. Do not weaken tests to hide them; report them
explicitly when they prevent a full green run.

## Code quality rules for agents

Don't optimize for smallest diff at the expense of architecture. Before implementing a feature, identify: what is domain state; what is server/repository state; what is form state; what is ephemeral UI state; where the feature belongs in FSD; which existing abstractions to reuse; what tests/e2e coverage are required.

Don't invent a local architecture inside a component when the project already has an established abstraction. Search the repo for an existing equivalent before adding a new one. Before implementing a form, inspect existing form patterns and follow the RHF + Zod conventions. Before implementing a Bottom Sheet flow, inspect existing Bottom Sheet wrappers and form flows. Before adding a new UI primitive, inspect `shared/ui`. Avoid clever abstractions that only exist to shave a few lines — prefer boring, explicit, composable code.

## Definition of Done

A feature isn't complete just because TypeScript accepts it. For a normal user-facing feature, completion means: correct FSD placement; existing project abstractions reused where applicable; form state handled by React Hook Form where the feature is a form; validation handled by Zod where applicable; domain/server constraints mirrored on the client only for UX; repository/TanStack Query boundaries respected; loading/error/empty states handled; accessibility/testIDs added; unit/component tests added where behavior warrants them; Maestro flow added/updated; `pnpm test:e2e` passes; type-check/lint/format/tests pass; no unnecessary duplicated state; no raw colors; no architectural shortcuts hidden inside UI components.

If a requirement conflicts with an existing architecture rule, stop and explain the conflict rather than silently violating it.

## Current not-yet-built decisions

- i18n wiring (`shared/i18n` + react-i18next) and localized tab/screen titles; RU strings hardcoded with `TODO(i18n)` markers until then.

## Session + sync (landed)

Offline-first sync per the `mobile-offline-first` change:

- **Session**: `entities/session` (session-api over `shared/api/client`, `AuthProvider`/`useAuth`). Auth is not gated — the app is fully usable anonymously; Settings exposes sign-in/out.
- Ownership gate at login (`sync_meta.owner_user_id`, design D9): same/empty owner binds and initial-syncs; a different owner must clear local data or cancel. Logout keeps local data.
- **Engine**: `shared/lib/sync/sync-engine.ts` — cycle push → conflicts → pull, per-record op chains, `sentAt` freeze + `attempts` backoff (5s → 15min), 401 pause/resume. Pull is skipped when push failed on transport, to avoid echoing server-applied changes back as pull-newer-on-dirty conflicts. Triggers live in `shared/lib/sync/sync-provider.tsx`.
- Conflicts are persistent rows (`shared/lib/sync/conflicts.ts` + `sync_conflicts`). `ConflictCenter` handles edit-vs-edit conflicts; delete-vs-edit uses delete-wins immediately and preserves the edit for restore-as-new-record.
- Status UI: `widgets/sync-status`. Backend URL: `EXPO_PUBLIC_API_URL`.
- Sync integration tests require `SYNC_INTEGRATION_API=<url> pnpm test sync-integration`.
- **Background sync** (dev build only): `shared/lib/sync/background-sync.ts` registers an `expo-background-fetch` task (15-min advisory interval) that runs one engine cycle headlessly over the same db + api client; anonymous devices skip it entirely. Best-effort by design — foreground triggers stay primary (correctness never depends on background runs).

## Local data layer (landed)

Offline-first foundation per the `mobile-offline-first` change:
```
shared/lib/db
entities/*/api/local-repository.ts
entities/*/api/repository.tsx
entities/*/model/
```
Uses expo-sqlite + Drizzle; migrations via `pnpm db:generate`. Writes to the outbox are transactional. Repository unit tests run SQLite for real through the `node:sqlite` adapter in `shared/lib/db/testing` — never import that adapter from application code.

Known e2e gap: `TODO(sheet-e2e)` in `shared/ui/bottom-sheet`. The data-creating flows in `.maestro/flows/05-08*` are annotated known-failing until Bottom Sheet input automation is stable.

## Important agent behavior

When a task reveals a missing project convention, don't silently establish a one-off pattern. Instead: determine whether it's project-wide; if yes, update the appropriate `AGENTS.md`/architecture doc; implement the feature using that convention; keep the implementation consistent with it. Don't add large architectural rules to a feature-specific file when they're actually project-wide.

Don't introduce a major library (e.g. React Hook Form, Zod) as an incidental dependency of a single feature without checking whether the project has an explicit decision/change adopting it. Use OpenSpec for architectural changes; a focused implementation change is sufficient for ordinary work that follows already-established architecture.
