## Why

The sync run-policy — post-mutation debounce, auth/household gate ordering,
and post-run cache invalidation — is rebuilt by hand in each app (~90 mirrored
lines in `apps/web/src/shared/lib/local-db/sync-composable.ts` and
`apps/mobile/src/app/_layout.tsx`), including a duplicated
`LOCAL_DATA_QUERY_KEY_ROOTS` list kept in sync by comments. The duplication
already diverged semantically: web awaits its household gate only on the auth
flip (visibility/online/mutation triggers bypass it), while mobile has no gate
in its `SyncProvider` at all and its parallel `HouseholdRebaseGuard`
explicitly tolerates sync runs slipping past the household choice. The
household spec requires the carry/clean choice "before any synchronization as
the new household", but neither platform enforces that consistently. The
archived `unify-sync-policy` change deliberately left the run-policy per-app
(design.md Non-Goals); this change finishes that unification.

## What Changes

- New run-policy module in `packages/local-data`
  (`createSyncRunPolicy`): one owner for the post-mutation debounce
  (2 500 ms), the gate order (authenticated → household-current → run),
  resume-on-auth, and the invalidation rule (`'sync'` always; the six entity
  key roots only when the cycle wrote local data). Zero configuration.
- `LOCAL_DATA_QUERY_KEY_ROOTS` moves to the package as the single source;
  both apps' hand-maintained copies and the "Keep in sync" comments are
  removed; entity model composables import the roots from the package.
- Both apps shrink to thin platform adapters over the policy (imperative
  `notifyAuthChange`/`notifySessionBoundary`/`notifyLocalMutation` wired to
  platform events, plus `isAuthenticated`, `ensureHouseholdCurrent?`,
  `invalidateKeys`, and the `onRunComplete` completion source); the engine
  and the web worker bridge are not modified.
- Household currency is established at session boundaries (app start,
  foreground/visibility, regained connectivity, authentication) before any
  sync run is triggered; runs inside a session do not re-check. When the
  household check cannot complete (e.g. offline), the run is skipped — never
  executed without the check. Manual refresh remains a fast path without a
  re-check.
- Behavior changes (toward the household spec): on web, visibility/online/
  mutation-triggered runs now also wait for the household gate (today only
  the auth flip does); on mobile, runs no longer slip past the household
  choice — `HouseholdRebaseGuard`'s triggers become policy session
  boundaries, its check becomes the `ensureHouseholdCurrent` resolver, and
  its carry/clean Alert UI stays app-side.
- The headless background fetch on mobile (`background-sync.ts`, a second
  engine instance without a household check) is intentionally out of scope
  and recorded in design.md as a known uncovered path.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `household`: the requirement "Joining device chooses what happens to local
  data" is clarified — the choice SHALL be enforced at session boundaries
  (app start, foreground, regained connectivity, authentication) before any
  sync run as the new household is triggered; within a session runs need not
  re-check; if the check cannot complete, the run is skipped rather than
  executed without the check.

## Impact

- `packages/local-data`: new `src/sync/run-policy.ts` + tests (fake engine,
  fake timers); `LOCAL_DATA_QUERY_KEY_ROOTS` export; index re-exports. No
  new dependencies (no query-core/colada imports — the package stays
  platform-agnostic; mutation-cache and invalidation stay behind app
  adapters).
- `apps/web`: `sync-composable.ts` becomes a thin adapter (visibilitychange/
  online sources, colada mutation-count watch, pinia auth state, key-root
  invalidation); `AppShell` still injects the household resolver; entity
  composables import the shared key roots.
- `apps/mobile`: `_layout.tsx` SyncProvider becomes a thin adapter (AppState/
  NetInfo sources, react-query mutation-cache subscribe, auth context,
  invalidation); `household-rebase-guard.tsx` is absorbed (its second
  AppState listener and parallel check disappear; the carry/clean Alert flow
  remains in `use-household-join`).
- Specs: `openspec/specs/household/spec.md` delta (one MODIFIED requirement).
- No backend, OpenAPI, or sync-protocol wire changes.
