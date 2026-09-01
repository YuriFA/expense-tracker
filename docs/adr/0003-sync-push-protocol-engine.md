# ADR-0003: Sync push-protocol engine — one protocol, per-entity adapters

- **Status:** Implemented (2026-09-01, strangler steps 1-4 of decision 5;
  accepted the same day — the `adjustment-transactions` change had just
  landed and archived, satisfying decision 5's gate)
- **Scope:** backend sync push surface only — `service/sync.go`,
  `repository/postgres/sync.go`, the `SyncTx` interface, `service/fakes`;
  no behavior change, no OpenAPI contract change
- **Related:** `docs/architecture/invariants.md` #7 (change_log atomicity),
  #18 (repository mechanics vs policy); `openspec/specs/sync-protocol/spec.md`
  (unchanged at requirement level); evidence: the 2026-09-01 repo audit and
  architecture review (`docs/architecture/audit-2026-09.md`)

## Context

The push protocol — idempotent replay → decode → validate → base-0 create vs
CAS update → four-way conflict classification → replace + race re-read →
applied-op recording — is hand-copied once per entity rather than existing as
one module:

- `service/sync.go`: six apply/delete twins ≈ 860 of 1200 lines; three carry
  `//nolint:dupl` ("twins: identical protocol shape").
- `repository/postgres/sync.go`: five per-entity string dispatches and 18
  twin write methods (six more `//nolint:dupl`).
- `repository/interfaces.go`: `SyncTx` is a 39-method interface whose width
  equals its implementation's; every entity adds 4–5 methods here plus the
  same in postgres and the fake.
- `service/fakes`: a ~2470-line in-memory second database re-deriving SQL
  semantics (uniqueness maps, CAS classification, ordering, the balance
  view), already drifted: fake `CreateCategory` skips the change-log append
  the real repository performs (`fakes.go:520` vs
  `postgres/categories.go` — found by the 2026-09-01 audit).

These are the three most-changed backend files since 2026-08-20. The
in-flight `adjustment` change paid the scaffolding price: ~13 of ~24 backend
files touched were mechanical ripple through the twins, the widest interface
in the codebase, and the fake — not the entity logic itself.

## Decision

1. **One push-protocol engine in the service layer** owns the skeleton:
   replay, decode, create-vs-CAS, conflict/serverState shaping, replace +
   race re-read, applied-op recording, per-item result mapping.
2. **A per-entity adapter** supplies what actually differs: state type +
   decode, validation (incl. immutability / in-use guards), the entity's
   create/replace/tombstone persistence calls, and the serverState
   projection. A new synced entity becomes one adapter file, not ~170 lines
   across four places.
3. **`SyncTx` collapses** to small per-entity contracts (~5 methods each) plus
   a tiny shared core (applied-ops, adopt-orphaned, transaction lifecycle).
   postgres and the fakes implement the same per-entity contracts — the
   fake's interface shrinks from "all of Postgres" to the contracts,
   shrinking its drift surface.
4. **Behavior is frozen.** Outcomes (per-item codes, ordering, conflict
   shapes) are identical before and after. Known protocol oddities —
   batch-in-one-transaction semantics, orphan-adoption without a tombstone,
   string-literal sync error codes (audit findings) — are explicitly out of
   scope and stay unchanged for their own changes.
5. **Sequencing and rollout.** Start only after `adjustment-transactions`
   archives. Migrate strangler-style, simplest first, deleting twins as each
   entity moves: (1) account + debtor, fixing the fake `CreateCategory`
   change-log drift in the same step; (2) category + debt operation;
   (3) transaction (per-type refs, type immutability); (4) planned payment
   (immutability + advancement). Service + e2e suites stay green at every
   step.
6. **Driver honesty:** the primary payoff is locality on existing churn
   (protocol fixes land once; the fake stops mirroring). A possible future
   synced entity (goals / currency-rate snapshots — undecided product
   direction) would add direct payoff but is not required to justify this.

## Options considered

- **Extract shared helpers, keep six dispatch sites** — rejected: the seam
  stays per-entity; protocol-level changes still touch six call sites and
  the fake keeps mirroring them.
- **Adapter in the repository layer, thin service** — rejected:
  classification and conflict shaping are protocol logic that already lives
  in the service; moving them down blurs the #18 mechanics/policy split.
- **Big-bang rewrite of `sync.go`** — rejected: an unreviewable diff against
  a suite that could not distinguish refactor from regression; strangler
  keeps every step verifiable.

## Consequences

- `sync-protocol` spec and `docs/api/openapi.yaml` unchanged — this is an
  internal restructure with byte-identical observable behavior.
- No OpenSpec change accompanies the implementation — an internal
  restructure with frozen behavior (openspec/config.yaml: "do not mistake
  a technical implementation for a product requirement"); an OpenSpec
  change with a delta to `sync-protocol` becomes necessary only if the
  protocol's observable behavior is later changed (string-literal sync
  error codes, batch-in-one-transaction semantics, orphan-adoption).
- Invariants #7/#18 evidence sections and the backend AGENTS sync-surface
  notes are updated when this lands; at that point a new rule is recorded
  ("synced mutations go through the engine; new entities ship an adapter").
- Four independently landable steps touching the same files the adjustment
  change touched — the reason for the explicit sequencing decision.
- The fake remains (hermetic service tests stay fast and DB-free); only its
  interface narrows.
