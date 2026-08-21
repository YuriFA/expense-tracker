# Mobile component & state conventions

Canonical conventions for React component design, state choice, effects,
custom hooks, and memoization in `apps/mobile`. Forms have their own document
(`docs/conventions/forms.md`); this one covers everything around them.

These are reference patterns extracted from the code as it exists — every
example cites its file. Adapt them; don't copy-paste. Rules already carried by
`docs/architecture/invariants.md`, `apps/mobile/AGENTS.md`, and OpenSpec specs
are linked, not restated.

---

## 1. Effects

An effect synchronizes React state with something OUTSIDE React. That is its
only job. If the value is computable from existing state/props, derive it
(§2); if it happens in response to a user action, it is an event handler; if
it fetches application data, it is a query hook (invariant #16).

Use an effect exactly when you need to:

- **Subscribe to / unsubscribe from an external emitter** — and return the
  cleanup: NetInfo, AppState, and the mutation-cache subscription driving the
  post-mutation sync debounce in `src/app/_layout.tsx` (`SyncProvider`);
  `engine.subscribe` for sync state.
- **Run async init exactly once**, with a `cancelled` flag so a resolution
  landing after unmount doesn't set state: `openLocalDatabase()` in
  `_layout.tsx` (`AppDataProviders`), the session restore in
  `entities/session/model/use-auth.tsx`.
- **Issue imperative commands against non-React APIs** where no declarative
  prop exists: `listRef.current?.scrollToOffset(...)` in
  `features/create-transaction/ui/category-quick-bar.tsx`; Reanimated
  `progress.value = withTiming(...)` in `shared/ui/speed-dial/speed-dial.tsx`.
- **Drive an external system from state changes**: auth status flips →
  `engine.resume()` + `engine.run()` in `_layout.tsx`.
- **Register/unregister a module-level callback**: `setUnauthorizedHandler`
  in `use-auth.tsx`.
- **Re-initialize RHF when inputs change** — the sanctioned form-reset
  pattern (forms.md §3): `resetForm(defaultValues)` in
  `new-transaction-form.tsx`.

Never use an effect for:

- Copying state/props into other state (`useEffect(() => setX(derived), […])`)
  — derive at render instead (§2).
- Responding to a user action — put the logic in the event handler.
- Fetching application data — a query hook over a repository (invariant #16).
- "Making sure" a value is fresh before the next render — effects run AFTER
  render; that pattern produces flicker and duplicated renders.

### Deliberate stabilization idioms — do not copy reflexively

`features/sync-conflicts/ui/conflict-center.tsx` keys its prompt effect on a
joined-id signature (`conflicts.map(c => c.id).join(',')`) and reads the list
through a ref, because the query result is a fresh array identity on every
poll and re-prompting an unchanged set would loop. Correct there — and
subtle. Before copying this shape, check whether your dependency actually has
an unstable identity; most don't.

## 2. Choosing state

Prefer derivation over storage. Plain computation at render is the default:
`features/cashflow-overview/ui/all-cashflow-card.tsx` computes `latest` and
`sheetGroups` inline; `pages/transactions/ui/transactions-screen.tsx` derives
`monthTransactions`; `amount-field.tsx` derives its currency with
`accounts.find(...)`. No `useState`, no `useMemo` (§4) — just the expression.

```text
Can it be computed from what the component already has (props, query data,
form values)?
├─ yes → compute it at render
└─ no → what kind of value is it?
    ├─ persisted domain data → repository + entity query hook
    │   (UI → useTransactions() → repository context → SQLite; invariant #16)
    ├─ session / auth control-plane → entities/session (`use-auth`)
    ├─ form field value → React Hook Form owns it (forms.md)
    ├─ ephemeral UI value the user edits → useState
    │   (month cursor in dashboard/transactions screens, sheet reveal flags
    │   in form-actions.tsx, sort order in category-cashflow-sheet.tsx)
    ├─ state shared across distant parts of the tree → context with a
    │   throwing accessor hook (§3); split reader/writer contexts when
    │   writers would re-render readers (widgets/bottom-tab-bar/ui/
    │   tab-bar-height-context.tsx)
    └─ an imperative handle → useRef (BottomSheet refs, the debounce timer
        in _layout.tsx)
```

Anti-pattern: a `useState` mirroring query data or another state source. If
two pieces of state must "stay in sync", one of them is derived — and the
sync effect is the bug.

## 3. Custom hooks

A custom hook is justified when at least one of these holds:

- **Reuse** — two or more components need the same logic: the per-entity query
  hooks in `entities/*/model/use-*.ts`.
- **A real external system to encapsulate** — `useAuth` hides session
  restore, the 401 interceptor, and the ownership gate behind a six-method
  controller.
- **DI accessor** — thin hooks that inject a context and throw when the
  provider is missing (`useAccountRepository`, `useLocalDatabase`,
  `useSyncController`). A deliberate pattern; keep each one-purpose.
- **One isolated platform concern** — `useSheetFooterScroll` wraps a single
  Reanimated scroll-handler concern.

NOT justified:

- The function contains no hooks — then it is not a hook. See
  `useTransactionActions` in `src/app/(tabs)/_layout.tsx`: it builds an
  actions array with no hooks inside; a `use*` name there violates the React
  lint contract and misleads readers. It should be a plain builder function
  or module data.
- Wrapping one `useState` + its setter used at a single call site — inline it.
- A "screen organizer" hook that hides half a component's setup — that is
  relocation, not encapsulation; it obscures what the component subscribes
  to, which is exactly the information §1/§2 decisions need.

Placement follows FSD: entity data hooks in `entities/<entity>/model/`,
page-local hooks in `pages/<page>/model/`, infrastructure hooks in
`shared/lib/*`; hooks never import upward (invariant #15).

## 4. Memoization

The codebase memoizes rarely and deliberately — a handful of `React.memo`
(self-subscribing form leaves), a handful of `useMemo`, `useCallback`
concentrated in providers. That is the baseline to preserve. Memoization
solves specific problems; it is not a default:

- **Stable identity feeding context values, effect deps, or memoized
  children** — `useMemo` for the `SyncController` value in `_layout.tsx` and
  the `AuthController` value in `use-auth.tsx`; `useCallback` for the
  callbacks inside them.
- **Render isolation in a localized-subscription form** — `memo` on
  self-subscribing leaves (`TransactionSubmitField`, `NoteFieldButton`,
  `DateFieldButton`) so parent renders don't defeat their isolation
  (forms.md §8).
- **A genuinely expensive derivation**, with an explanatory comment when the
  deps choice is subtle — the day-groups memo in
  `features/cashflow-overview/ui/category-cashflow-sheet.tsx` keys on
  `categoryQuery.data` (a stable reference per fetch), not on a `?? []`
  fallback computed at render time.

Not reasons to memoize: list rows (`TransactionRow` in
`pages/transactions/ui/transactions-screen.tsx` and its siblings are
deliberately unmemoized — measure before changing that), "might be slow
someday", or functions passed to non-memoized children.

If you reach for memoization to fix a re-render storm in a form, first check
the subscription scope (forms.md §8) — the right fix is usually moving the
subscription to the component that renders the value, not wrapping components
in `memo`.

## 5. Component boundaries

Extract a component when the split creates a real boundary — at least one of:

- **Its own subscription** — the create-transaction form sections each own
  their slice of form state (forms.md §8).
- **Its own interaction model** — the keypad vs the form around it; the
  speed-dial overlay with its own animation lifecycle.
- **Container vs content** — the BottomSheet wrapper owns lifecycle, ref, and
  dismissal; the form owns state and submission (forms.md §3):
  `new-transaction-sheet.tsx` vs `new-transaction-form.tsx`.
- **Independent lifecycle** — `ConflictCenter` mounts once globally, returns
  null, and orchestrates conflict prompts.
- **Genuine reuse** — promote to `features/` at 2+ consumers; single-screen
  UI stays under `pages/<page>` (AGENTS.md placement rule).

Do NOT extract: JSX used once without any of the above, a split that costs
more props than the lines it saves, or splitting for line count. A 240-line
cohesive presentation sheet (`category-cashflow-sheet.tsx`) is fine; a thin
sheet wrapper split from its form is also fine — the difference is the
boundary, not the size (forms.md §7 states the same for forms).

Composition across slices: features never import each other; the page
composes them and passes callbacks (`onNewTransaction` in
`category-cashflow-sheet.tsx` — invariant #15).

## 6. Known deviations (registered — do not copy)

Observed 2026-08-21; listed as anti-references:

- `entities/session/model/use-auth.tsx` — `statusRef` is written every render
  and never read (dead code).
- `src/app/(tabs)/_layout.tsx` — `useTransactionActions` contains no hooks
  and rebuilds its icon elements every render (§3).
- `entities/category/model/use-categories.ts` — `useCategories(type)` spreads
  the query result into a fresh object identity per render; harmless today, a
  footgun near memo boundaries.
- `features/sync-conflicts/ui/conflict-center.tsx` — a local `toMinorUnits`
  with different semantics (parsing an already-minor serialized value) shadows
  the shared converter's name from `@expense-tracker/money`.
- `pages/accounts/ui/accounts-screen.tsx` — screen-local error state for a
  mutation; other screens surface errors through the RHF root slot or a
  badge.
