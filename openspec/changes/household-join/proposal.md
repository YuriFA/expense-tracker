# Proposal: household-join

## Why

`household-scoping` made the household the scoping key, but every user
still sits alone in a personal household — there is no way to actually
share a budget. This change delivers the join lifecycle from ADR-0002:
invitations by email plus a fallback home code, membership swap on accept
(the joiner's personal household is orphaned), the device-side rebase
that carries local data into the shared household through the existing
initial-sync union, and leave/remove/dissolve. It also teaches the sync
payloads to carry record authorship, which the UX change needs to show
"кем записано".

## What Changes

- **Invitations**: the household owner invites by email; the invitation
  carries a single-use accept token (emailed as a link, expiring,
  revocable); only the authenticated account with that email can accept;
  unregistered invitees register through the link first.
- **Home code**: the owner can issue a multi-use join code (revocable,
  rotatable); any authenticated user can join with it.
- **Join = membership swap**: accepting (either way) moves the joiner's
  single membership to the target household; the former personal
  household is orphaned (retained server-side, access lost); repeated
  accept is a no-op.
- **Device rebase (package)**: a new helper resets local bookkeeping for
  a household change — server-version counters to zero, pull cursor to
  zero, outbox regenerated wholesale as create operations, tombstones
  dropped — after which the existing initial-sync union
  (push-all-as-creates + pull-from-zero) applies unchanged. The joining
  client offers the user the choice: carry this device's local data over
  (rebase) or start clean (wipe + pull).
- **Leave / remove / dissolve**: members may leave; the owner may remove
  members and may dissolve the household (explicit destructive action);
  household data stays with the household in the first two cases.
- **Authorship in sync**: pull change payloads carry the author's user
  id (stamped by the server from the session); local schemas store it
  per row; the push direction never trusts client-sent authorship.
- **Household name**: households gain an optional display name (owner
  editable) used by invitation and member UIs.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `household`: adds invitation, home-code, join (membership swap with
  the joiner's local-data choice), leave/remove/dissolve, and the
  household display name.
- `sync-protocol`: adds the household-rebase semantics (what a device
  does when its household changes) and authorship in change payloads.

## Impact

- `backend/`: migration 000006 (invitations, codes, household name),
  household service + endpoints, mailer template for invitations,
  sync pull payload gains author id.
- `docs/api/openapi.yaml` + regenerated types (`make gen`, `pnpm gen:api`).
- `packages/local-data`: `rebaseLocalDataForHousehold` helper; local
  schema gains per-row author `user_id` (+ migration 0003); pull-apply
  stores authorship; package tests.
- `apps/mobile` + `apps/web`: invitation deep links, accept screen with
  the data choice, join-by-code entry, leave flow; sync integration
  coverage for the two-household rebase path.
- No changes to the push/pull wire shapes beyond the additive author
  field.
