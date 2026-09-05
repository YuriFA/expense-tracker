# ADR-0006: Household scope as a first-class type (`domain.Scope`)

- **Status:** Accepted (2026-09-05)
- **Scope:** backend internal seams (transport → service → repository); no
  OpenAPI contract change, no domain behavior change
- **Related:** `docs/adr/0002-household-shared-budget.md` (household scoping is
  the recorded authority); invariant #5 in `docs/architecture/invariants.md`;
  finding A16 in `docs/architecture/findings.md`

## Context

Household scoping and authorship traveled as two positional UUIDs —
`(householdID, actorID)` — through 26 repository write methods, the service
layer, the sync push engine, and 19 transport call sites, plus 41
household-only read methods taking a bare `householdID`. Both are `uuid.UUID`,
so a swap compiles. Finding A16 was exactly that: a handler passed `user.ID`
where `householdID` belonged, and every fresh registration got empty debt
listings (fixed in `b218cbb`, guarded by `TestE2E_DebtsListingsHouseholdScoped`
— but nothing at the type level prevented a repeat at any of the other seams).

## Decision

One type carries both ids across every household-scoped seam:

```go
// internal/domain/scope.go
type Scope struct {
    HouseholdID uuid.UUID // IDOR scope: which household the record belongs to
    ActorID     uuid.UUID // authorship stamp: who authored the change
}
```

- Every household-scoped repository and service method — writes and reads —
  takes `scope domain.Scope` as one argument (invariant #5 is now enforced by
  the compiler: a bare `user.ID` handed to a scoped seam does not compile).
- Construction is few-sited and explicit: `Server.currentScope` (the auth
  middleware's session → user → membership resolution), `membershipScope`
  (household service), the auto-confirm job (per-plan: the plan's author — the
  job acts on their behalf; its due-scan passes a zero-ActorID scope because
  the actor is unknown until the plans are read), and pre-membership reads of
  a target household (join/invitation flows). Reads ignore `ActorID`.
- Repository `Create*` signatures keep their params structs — named
  `HouseholdID`/`UserID` fields cannot transpose.
- **Non-goals**: the near-miss methods whose second UUID is semantically
  different stay positional — `CreateHouseholdInvitation` (`createdBy`
  separated by `email`), `JoinHousehold` (`userID, targetHouseholdID` — a
  target, not the actor's scope), `RemoveHouseholdMember`
  (`targetUserID`). Forcing them into `Scope` would blur its meaning.
- User-scoped seams (sessions, profile, verification) are out of scope by
  definition: the user IS the identity there.

## Consequences

- A new household-scoped method cannot accidentally take positional UUIDs
  without breaking the pattern visibly.
- Implementations unpack locals (`householdID, actorID := scope.HouseholdID,
  scope.ActorID`) where sqlc query args want bare UUIDs — the pair never
  crosses a module boundary.
- The zero-ActorID read scopes (job scan, join previews) are reads; no
  authorship is stamped from them.
