# ADR-0005: Backend write rules module - one home per entity for REST and sync

- **Status:** Accepted (2026-09-05)
- **Scope:** backend write-path validation structure (service + sync adapters + domain error specs); no sync protocol behavior change, no OpenAPI contract change for the transaction pilot
- **Related:** `docs/adr/0003-sync-push-protocol-engine.md`; `docs/adr/0004-sync-entity-catalog-source-of-truth.md` (the catalog owns structure, this module owns rules); `CONTEXT.md` (`Sync entity`, `Sync entity catalog`)

## Context

The same domain write rules were written twice: the REST services validate writes
(`TransactionService.validateRefs`, `ValidateAmount`) and the sync push adapters
re-implement the same rules for the same outcomes
(`validateSyncRefs` + per-code message tables), with per-item machine codes
duplicated as string literals mirroring the REST codes from the transport
error-mapping table. The sync entity catalog (ADR-0004) deliberately excluded
write rules, so the duplication remained.

The transaction entity carries the largest share (~200 lines on each side with
identical semantics), and the two paths had already drifted in places
(planned payment: archived-category rejection missing on sync, divergent
codes/wording). The transport error map ("one place" for `ErrorResponse`) was
REST-only: sync per-item results carried their own parallel code/message space.

## Decision

Introduce a **write rules module** in `internal/service`: one file per entity
(`write_rules_<entity>.go`), the single home of the transport-agnostic rules a
write must satisfy. Both surfaces call it with the **effective full state** of
the record:

- the REST service merges a PATCH into the current row first (the merge code
  stays in the service - it is transport shape, not rule);
- the sync push adapter passes the wire-decoded full state.

The module returns **domain sentinel errors**. The sentinel -> (machine code,
message) wire-spec table moves from the transport (`errormap.go`) into the
domain (`domain.ErrorSpecFor`): REST adds only the HTTP status (its table is
now status-only), and the sync adapters build their per-item results from the
same specs - the string-literal code duplication dies. A transport test guards
that every status-mapped sentinel carries a spec.

Boundary with the sync entity catalog (ADR-0004) is unchanged: the manifest
owns structural knowledge, this module owns rules and their outcomes. The
module is handwritten Go, not generated - the live rules are read-dependent
branching with per-case outcomes, which a declarative manifest cannot own.

What stays in the adapters: the malformed-data guard (entity-specific
message via the catalog) and the engine's immutability hook (whose rule is
expressed through `ValidateTransactionTypeImmutable` + its sentinel, but whose
invocation shape is protocol machinery). REST update keeps structural type
immutability (the update params omit the type).

The OpenAPI request-validator middleware stays the first validation line on
both surfaces (the sync push body is schema-validated through the same
`*SyncData` schemas). The per-item Go shape checks stay as the second line on
purpose: `TransactionSyncData` cannot express per-variant `required` without
collapsing the batch, and ADR-0003's per-item independence (one malformed
operation gets its own error result, the rest of the batch proceeds) outranks
spec tidiness. The spec is therefore not tightened.

## Considered options

- **Keep two per-path validators** - rejected: proven drift (planned payment
  archived-category gap, divergent codes) and ~500 lines of semantically
  duplicated validation.
- **Generate Go validators from the sync catalog manifest** - rejected: rules
  are read-dependent branching with outcomes, not structure; would also
  violate ADR-0004's boundary.
- **A shared `internal/writerules` package** - rejected: both callers live in
  `internal/service`; a separate package adds a layer without isolating
  anything.
- **Validate in `internal/domain` (pure functions)** - rejected: the rules
  need repository reads (reference liveness); domain has no read contracts.

## Consequences

- Transaction is migrated (pilot): `validateRefs`/`validateSyncRefs` and the
  per-code message tables are deleted; both paths call
  `ValidateTransactionWrite`. Table tests in `write_rules_transaction_test.go`
  are the new home of rule coverage; the existing service/sync suites passed
  unmodified - the behavior-preserving proof.
- Remaining entities migrate one by one (planned payment next; its three real
  divergences get resolved to the canonical REST behavior in an OpenSpec
  change in the same PR). Delete guards (account in-use, category cascade)
  join the module as those entities are reached.
- A new sentinel error must get a `domain.errorSpecs` row (and a transport
  status row); the coverage test fails otherwise at the transport seam.
- Client-side (web/mobile) validation is intentionally out of scope: it is a
  UX subset with a different job, not an enforcement surface.
