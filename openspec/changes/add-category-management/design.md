## Context

Categories today are household-scoped (ADR-0002) with a hard deletion guard
(`CATEGORY_IN_USE`), soft tombstone deletes, optimistic concurrency via
`version`, and full offline mirrors in `packages/local-data` (web SQLite-WASM
and mobile SQLite share it). The sync push protocol carries per-entity
operations with base revisions; the server appends change-log entries
atomically (invariants #17-#18). `docs/api/openapi.yaml` is the contract
source of truth; backend (`make gen`) and TS types (`pnpm gen:api`) are
generated. Web mutations go through local repositories + outbox; mobile is
offline-first the same way.

## Goals / Non-Goals

**Goals:**
- Archive as a plain field on the category record - no new entity, no new
  endpoints beyond a flag and a listing parameter.
- Cascaded delete that is atomic server-side, replayable offline, and
  propagated to other devices as ordinary per-record tombstones.
- Minimal mobile footprint (correctness only).

**Non-Goals:**
- Mobile category management UI (separate change).
- Reassigning transactions to another category on delete.
- Hard/irreversible deletes or an "uncategorized" bucket.
- Bulk operations.

## Decisions

### D1. Archive is `archivedAt` on the record, set via the normal update path

Alternatives: a dedicated `/archive` endpoint; an `archived` boolean.
A timestamp field carries when the category was archived (useful in the
management UI), rides the existing update operation (optimistic concurrency
and sync payload for free), and follows the `deletedAt` tombstone precedent.
Dedicated endpoints would duplicate the update contract; a boolean loses
information.

### D2. Cascade is an explicit flag on the existing delete, not a new endpoint

`DELETE /api/categories/{id}?cascade=true` and the same flag inside the sync
delete-operation payload. Alternative - a separate
`POST /api/categories/{id}/delete-with-transactions` - adds a second delete
contract, a second code path, and a second sync-op kind for no gain. The
flag keeps "guarded by default": forgetting the flag can never cascade.

### D3. Server replays the cascade; clients mirror it locally

Offline flow: the local repository applies the cascade in one local
transaction (tombstone the category + every referencing non-deleted local
transaction, recompute balances) and enqueues a single delete operation with
the cascade flag. On push, the server performs the same cascade against the
authoritative state inside one database transaction and appends a change-log
entry per tombstoned record (invariant #17). Other devices (and the
originating device's confirmation) receive individual tombstones via pull,
which the existing delete-wins conflict machinery already handles per record.

Alternative considered: the client enumerates and enqueues N+1 individual
delete operations. Rejected: racy (new transactions can appear on other
devices between enumeration and push), doubles the outbox, and lets a
half-applied batch leave the mirror inconsistent with the server.

### D4. Any household member may cascade

Product decision recorded in the proposal: the shared budget means shared
ownership of history. The existing author-scoped "delete own transaction"
rule stays for the per-transaction path; the cascade is deliberately a
household-level action behind typed confirmation. Role gating was considered
(owner-only) and rejected by the product owner.

### D5. `CATEGORY_ARCHIVED` as a 422 error code

It sits with its sibling category-reference violations on transactions -
`CATEGORY_NOT_FOUND` and `CATEGORY_TYPE_MISMATCH`, both 422 - not with the
409 conflict family (in-use, version-conflict). Clients switch on the code
(invariant #4), so the status is secondary but must not mislead. (Adjusted
from an initial 409 plan during implementation for consistency with the
existing transaction-create 422 catalog.)

### D6. Counts come from the local mirror, never from the API

Both apps hold the full transaction mirror locally; a count endpoint would
be a new API surface used only by confirmation dialogs. The dialog counts
may drift from what the server will actually tombstone (racing devices) -
acceptable: the confirmation communicates intent and scale, and the server
cascade remains authoritative (D3 racing-transaction scenario).

### D7. Local schema and API migrations

- Postgres: nullable `archived_at TIMESTAMPTZ` on `categories`; no
  backfill (null = active).
- `packages/local-data` (drizzle): same column + migration; listings gain an
  include-archived option; the category repository's `remove` gains the
  cascade branch; the transaction repository validates archived references.
- OpenAPI: `Category.archivedAt` (nullable date-time), `?cascade=true` on
  delete, `?includeArchived=true` on list, `CATEGORY_ARCHIVED` 409 example
  on transaction create/update, archive/unarchive ride
  `CategoryUpdateRequest.archivedAt`.

### D8. Web UI is designed in Superdesign before implementation

The `/settings/categories` screen (list, archive section, edit dialog,
hybrid delete dialog) is first drawn on the Superdesign canvas and approved,
then implemented from the approved design. Design exploration happens
before the web tasks start, not in parallel with them.

## Risks / Trade-offs

- [A member can destroy the household's transaction history in one action]
  → Mitigated only by UX: cascaded delete is never the default choice, the
  dialog states the transaction count and balance impact, and exact-name
  typing is required when transactions exist. Accepted product tradeoff (D4).
- [Dialog counts can differ from the server-side cascade] → The server
  cascade is authoritative; pull reconciles. The dialog wording says "will
  be deleted", which stays true for every transaction visible to the user.
- [Cascade flag smuggled into a guarded delete by a buggy client] → The flag
  exists only on the delete operation; local repositories expose archive
  and cascade as separate methods, and the web UI wires the cascade solely
  behind the typed-confirmation dialog.
- [`archivedAt` widens every sync payload and listing row] → Nullable
  scalar, negligible; listings exclude archived by default so pickers stay
  unchanged in size for the common case.

## Migration Plan

1. OpenAPI first, regenerate backend + TS types (`make gen`, `pnpm gen:api`).
2. Backend: migration + domain + handler + change-log cascade (deployable
   before any client uses the flag; default behavior unchanged).
3. `packages/local-data`: schema migration, repositories, outbox flag.
4. Mobile minimum (pickers + validation).
5. Web: Superdesign pass, then the settings screen.
Rollback: each step is backward compatible; deploying clients before the
backend is the only ordering constraint (new query params/fields are ignored
by the old server, so even that degrades gracefully except the cascade flag
itself, which the old server rejects as a guarded delete - acceptable).

## Open Questions

(none)
