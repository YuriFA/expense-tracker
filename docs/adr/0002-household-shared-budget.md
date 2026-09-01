# ADR-0002: Household — single shared data space for the family budget

- **Status:** Accepted (2026-08-26); implemented 2026-08-27 by the household changes
  (`2026-08-27-household-scoping`, `2026-08-27-household-join`, `2026-08-27-household-ux`
  in `openspec/changes/archive/`)
- **Scope:** backend data model & sync scoping; client sync semantics; no API contract change decided here
- **Related:** `docs/architecture/invariants.md` #5 (user-scoped data), #7 (change_log
  atomicity / per-user advisory lock); `openspec/specs/sync-protocol/spec.md`

## Context

The product serves a family: the owner and close relatives share one budget. The
decided product model (2026-08-26 planning) is a **single shared space** — all
accounts, categories, transactions, debtors, debt operations, and planned
payments are common to every member from the moment they join; there is no
per-resource sharing and no private corners. Roles: `owner` and `member`.

Today everything is strictly per-user scoped, with no household notion anywhere
in the backend or `docs/api/openapi.yaml`:

- Service methods take `userID` as their first parameter
  (`backend/internal/service/account.go`).
- Every query scopes `WHERE user_id` (`backend/internal/repository/queries/accounts.sql`).
- Sync plumbing keys on `user_id`: `change_log`, `applied_operations`, and the
  per-user advisory lock allocating `seq` (`backend/internal/repository/queries/sync.sql`).

The web client will also be offline-first with anonymous usage (roadmap stage 4):
a device may hold local data before login, then before joining a household —
the join path must compose with that.

## Decision

1. **New entities.** `households` and `household_members(household_id, user_id,
   role owner|member, joined_at; PK (household_id, user_id))`. Every user has
   exactly one membership in v1; the table leaves room for more later.
2. **`household_id` becomes the scoping key.** Entity tables gain
   `household_id NOT NULL`; the existing `user_id` columns stay as
   authorship/audit. Service signatures change `userID` → `householdID`;
   queries scope `WHERE household_id`. The auth middleware resolves
   session → user → household and enforces membership, so IDOR-safety is
   preserved; invariant #5 generalizes from "per user" to "per household".
3. **Sync plumbing re-keys to `household_id`.** `change_log` and
   `applied_operations` key on the household; the advisory lock (and therefore
   `seq` allocation) is per household — invariant #7 generalizes to "per
   scoping unit". Pull returns household-wide changes to every member device;
   the stored cursor stays per-device, pointing into the household stream.
4. **Joining reuses initial-sync semantics — no server-side merge.** Accepting
   an invitation only adds a membership row. A device holding local data
   merges through the existing initial-sync path already specified for
   login-with-local-data: push-all-as-creates + pull-from-zero, union merge by
   record id (`openspec/specs/sync-protocol/spec.md`). UUID v4 ids do not
   collide across members; idempotent creates already exist. A joining
   member's former personal household is orphaned (retained, access lost).
5. **Backfill migration.** One-off SQL migration: create a personal household
   + owner membership for every existing user; backfill `household_id` on all
   entity rows, `change_log`, and `applied_operations`. Safe because no
   sharing exists today.
6. **Leaving/removal.** Household data stays with the household —
   contributions are shared by definition; leaving only revokes access.
   Roles in v1: `owner` manages members/invitations/dissolution; `member`
   reads and writes shared data.

## Options considered

- **Resolve members via JOIN without `household_id`** — rejected: complicates
  every query and breaks straightforward `change_log` scoping and per-scope
  `seq` allocation.
- **Per-resource ACL sharing (share specific accounts/categories)** — rejected
  by product decision (single shared space); rights model and picker UI for a
  scenario nobody asked for.
- **Owner-as-household proxy sessions (data belongs to the owner; members act
  via delegated sessions)** — rejected: abuses the auth model, loses member
  identity in audit, entangles session lifecycle with membership.

## Consequences

- Implementation landed as its own OpenSpec changes (stage 5); this record fixes
  the direction only. Web/UI work for households is likewise out of this ADR.
- OpenAPI additions happen at implementation: household endpoints (get mine +
  members, create/accept invitation, leave/remove member). Sync push/pull
  shapes are unchanged — scoping is server-side.
- Invariants #5 and #7 need wording generalized to household scoping when the
  change lands; this record is the authority for that edit.
- `sync-protocol` gains a delta at implementation: local owner binding in
  `sync_meta` stays keyed by `user_id`; a household switch on a device
  triggers the initial-sync union path (same machinery as login with local
  data). Multi-device members each union their own local state; record-id
  union merge deduplicates, exactly as the anonymous→account migration does.
- Anonymous web usage composes with joining: anonymous → register/login
  (already specified) → accept invite → union — the same machinery twice.
