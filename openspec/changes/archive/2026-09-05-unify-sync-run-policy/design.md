## Context

Both apps rebuild the same run-policy around the sync engine. Web:
`apps/web/src/shared/lib/local-db/sync-composable.ts` (debounce 2 500 ms,
auth watch, visibility/online triggers, a colada mutation-cache success-count
watch, key-root invalidation, and an optional `ensureHouseholdCurrent`
awaited **only** on the auth flip). Mobile: `apps/mobile/src/app/_layout.tsx`
`SyncProvider` (~90 mirrored policy lines; NetInfo/AppState triggers,
react-query mutation-cache subscribe) plus a parallel
`household-rebase-guard.tsx` that checks household on mount/auth/foreground
and explicitly tolerates runs slipping past the choice. Both files carry a
hand-copied `LOCAL_DATA_QUERY_KEY_ROOTS` list with a "Keep in sync" comment.

Two asymmetries shape the design:

- The two mutation caches are structurally different: web uses
  `@pinia/colada` (a Vue-reactive success count), mobile uses
  `@tanstack/react-query`'s query-core `MutationCache.subscribe`. No shared
  cache API exists to consume, so mutation detection can only cross the
  package seam as a callback.
- On web the engine lives in a Web Worker behind a Comlink bridge that
  already proxies everything the policy needs (`run`/`resume`/`getState`/
  `subscribe` plus the `onRunComplete({wroteLocalData})` signal), so the
  policy can run on the main thread with zero bridge changes.

The archived `unify-sync-policy` change listed the run-policy in its
Non-Goals; this change is that deferred item. The engine itself stays
untouched (ADR-0003 shape: transport-pure, no app state).

## Goals / Non-Goals

**Goals:**

- One owner for gate ordering, debounce, resume-on-auth, and the
  invalidation rule; apps keep only platform adapters.
- Kill the semantic divergence: household currency enforced at session
  boundaries on both platforms, per the household spec delta.
- Single source for the six entity key roots.

**Non-Goals:**

- Any engine or worker-bridge change; any protocol/wire change.
- A full query-key registry (73 inline literals stay; separate cleanup).
- The mobile headless background fetch (`background-sync.ts`): a second
  engine instance gated only by the owner marker, with no household check —
  **known uncovered path**, intentionally left as-is (server-side household
  scoping applies; revisit in a dedicated change if needed).
- The web `completeAuthentication` RPC pair (`getOwnerUserId`/
  `setOwnerUserId`) instead of the package's `adoptUnowned` — ownership
  policy, one-line follow-up, not run-policy.
- Configurable policy knobs (debounce values, gate toggles). Divergent
  per-platform values are the drift this change removes.

## Decisions

### D1. Policy composes the engine; the engine is untouched

`createSyncRunPolicy` wraps any `{ run, resume }` — the real engine on
mobile, the Comlink proxy on web. Alternative — moving gates inside
`engine.run` — rejected: the engine would need auth/household state
providers, widening its interface exactly where it is deepest today.

### D2. Orchestration in the package, platform effects behind callbacks

The package owns decisions *and* their timing; platform event sources,
mutation detection, and invalidation cross the seam only as callbacks and
notify calls (apps keep their own event wiring and cleanup). Alternatives:
(a) decision-core that returns "what to invalidate" — rejected, invalidation
timing would drift per app again; (b) depending on `@tanstack/query-core` in
the package — rejected, it saves five adapter lines, adds a dependency, and
is impossible to unify with web's colada anyway. Dependency-cruiser would
not flag query-core, but the adapter keeps the package platform-agnostic by
construction rather than by allowlist.

### D3. Adapter surface (imperative notifies)

```ts
createSyncRunPolicy({
  engine: { run(options?: { force?: boolean }): unknown; resume(): void };
  isAuthenticated(): boolean;
  ensureHouseholdCurrent?(): Promise<void>;       // app resolver; carry/clean UI stays app-side
  invalidateKeys(keys: readonly (readonly string[])[]): void;
  onRunComplete(cb: (r: { wroteLocalData: boolean }) => void): () => void;  // completion source
})
// → { notifyAuthChange(authed), notifySessionBoundary(), notifyLocalMutation(),
//     runNow(force?), dispose() }
```

`onRunComplete` is the engine's completion signal (`wroteLocalData` lives
only there, not in `SyncRunOutcome`): web wires the worker-bridge
`onSyncRunComplete` fan-out, mobile the `createSyncEngine` option. Web:
visibilitychange/online + colada count watch + pinia auth + AppShell's
existing resolver + vue-query invalidation. Mobile: AppState/NetInfo +
react-query subscribe + auth context + the guard's `checkHousehold` promoted
to resolver + react-query invalidation.

### D4. Household gate at session boundaries

Boundaries: app start, foreground/visibility, regained connectivity,
authentication. Within a session, debounced runs and manual refresh do not
re-check. A boundary run awaits `ensureHouseholdCurrent()`; while it pends,
later runs queue behind it (the engine coalesces); if it rejects (offline),
the run is **skipped**, never executed un-gated, and retried at the next
boundary. Alternatives: checking on every run (a network round-trip per
debounced run) or auth-flip only (today's web — leaves the foreground gap
the mobile guard closes). This decision is the spec delta's subject.

### D5. HouseholdRebaseGuard is absorbed

Its mount/auth/foreground effects become policy session boundaries; its
`checkHousehold` becomes the `ensureHouseholdCurrent` resolver; the
non-cancelable carry/clean Alert stays in `use-household-join`. The guard's
second AppState listener and its header comment ("a sync run slipping in
before the choice is acceptable") disappear — the tolerance is revoked by
this change.

### D6. Invalidation rule and key roots

`onRunComplete`: always invalidate `['sync']`; invalidate the six entity
roots only when `wroteLocalData` (the anti-flicker contract). The roots live
in `run-policy.ts` as `LOCAL_DATA_QUERY_KEY_ROOTS` and are imported by the
apps' entity model composables, deleting both hand-copies and their "Keep
in sync" comments.

### D7. Naming and home

`packages/local-data/src/sync/run-policy.ts`, export `createSyncRunPolicy`,
re-exported from the package index alongside `ownership.ts`. Not
"sync-controller": there is one policy, controllers were two.

### D8. Rollout: one change, package first

Both apps land in this change (the divergence is half the bug), but the
package and its tests come first so no app ever consumes an untested
policy. Each step is independently green.

## Risks / Trade-offs

- [Web behavior change: visibility/online runs now wait for a household
  round-trip] → Same cost mobile pays today via the guard; the resolver
  fails fast offline and the run is simply skipped until connectivity
  returns (correctness does not depend on background sync per the
  sync-protocol spec).
- [Mobile first run blocks on the carry/clean choice] → Matches web and the
  household spec: the choice is destructive, blocking is correct. The Alert
  is already non-cancelable.
- [A resolver that never resolves parks all runs] → Runs queue behind it
  and coalesce in the engine; the choice is mandatory by spec, so parking
  is the intended behavior, not a leak.
- [Package-owned timers outliving app components] → `dispose()` cancels
  timers and subscriptions; adapters call it from component/composable
  teardown (web singleton lives for the app lifetime, mobile SyncProvider
  unmount).
- [Background-fetch path stays un-gated] → Documented above as a Non-Goal;
  server-side household scoping still applies to its pushes.

## Migration Plan

1. Package: `run-policy.ts` + roots export + full test suite (fake engine,
   fake adapters, fake timers). Nothing consumes it yet.
2. Web: composable becomes the adapter; entity composables import the
   roots. Behavior delta: boundary runs now gated (D4).
3. Mobile: SyncProvider becomes the adapter; guard absorbed per D5.
4. Docs: household spec delta archived with the change; AGENTS.md pointers
   only if the package README needs the new policy surface.

Rollback: the policy is additive; each app step reverts independently to
its previous inline policy.
