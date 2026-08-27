# Proposal: household-scoping

## Why

The product serves a family sharing one budget, but every record today is
scoped to a single user — accounts are islands. ADR-0002 (accepted
2026-08-26) fixes the model: a single shared data space (household) per
family with owner/member roles. This change lays the backend foundation:
the scoping key becomes the household, and every existing user
automatically gets a personal household of one, so nothing changes for
current single users while the join flows arrive in the next change.

## What Changes

- **Migration `000005_household`**: new `households` and `household_members`
  tables (`role owner|member`, PK `(household_id, user_id)`); `household_id
  NOT NULL` added to all shared entity tables (`user_id` columns stay as
  authorship); `change_log` and `applied_operations` re-key to
  `household_id`; the sync advisory lock (and with it `seq` allocation)
  becomes per household; backfill creates a personal household + owner
  membership for every existing user and stamps every existing row.
- **Backend re-key**: service signatures `userID` → `householdID`; all
  queries scope `WHERE household_id`; the auth middleware resolves
  session → user → household and enforces membership (IDOR-safety moves
  from per-user to per-household; invariants #5 and #7 generalize).
- **OpenAPI (additive)**: `GET /api/household` (own household with
  members: email, display name, role, joined date); `User` gains optional
  `displayName`; `PATCH /api/me` to edit the display name. Regenerated
  types everywhere (`make gen`, `pnpm gen:api`).
- **Spec wording generalized**: requirements that literally scope to "the
  user" in `accounts`, `categories`, `transactions`, `debts`, and the
  local-mirroring wording in `mobile-local-data` change to household
  scoping; the new `household` capability is the authority on membership
  and scoping.
- **No client behavior changes**: with every user alone in a personal
  household, mobile and web keep working unmodified (additive API types
  only).

## Capabilities

### New Capabilities

- `household`: membership and scoping model — automatic personal household
  per user, single membership in v1, household-scoped data access, member
  listing, and the user display name.

### Modified Capabilities

- `accounts`: "Account ownership and scoping" re-scopes accounts from user
  to household.
- `categories`: "Category ownership and scoping" re-scopes categories
  (incl. name uniqueness) from user to household.
- `transactions`: "Referenced entities must exist, belong to the user, and
  match the type" requires references to belong to the requesting
  household.
- `debts`: "Debt ownership and scoping" re-scopes debtors and debt
  operations (incl. debtor-name uniqueness) to the household.
- `mobile-local-data`: "Domain rules enforced locally" mirrors the
  household-scoped uniqueness wording.

## Impact

- `backend/`: migration 000005 (up/down), `internal/repository/queries/*`
  (11 files, ~140 `user_id` scoping mentions), `internal/service/*`
  (signatures), auth middleware, sqlc regen (`make gen` + drift gate),
  service tests extended with cross-household isolation cases.
- `packages/api`: `schema.ts` regen (additive: household endpoint,
  displayName).
- Docs: `docs/architecture/invariants.md` #5/#7 generalized wording;
  `docs/adr/0002` stays the decision record; architecture overview
  pointers.
- Sync protocol shapes unchanged — scoping is server-internal
  (`sync-protocol` needs no delta in this change).
- Clients: none (verified by existing suites staying green).
