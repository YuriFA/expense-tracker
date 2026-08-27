# Design: household-ux

## Context

After `household-scoping` (model, scoping, display-name API) and
`household-join` (invitations, codes, rebase, authorship in sync
payloads and local rows), everything this change needs already exists at
the data level. Both clients have settings screens; the web is Vue/reka-ui
FSD, the mobile twin is React Native FSD; both localize (RU
authoritative, EN mirrors) and share `@expense-tracker/api` clients for
the household endpoints.

## Goals / Non-Goals

**Goals:**

- One coherent household section per client, role-aware, mirroring the
  mobile/web twin structure for reviewability.
- Authorship labels driven purely by stored author ids + the household
  members cache; zero backend work.

**Non-Goals:**

- New backend endpoints or package changes.
- Push/in-app notifications about joins (nothing observes membership
  changes live in v1; the section refetches on open).
- Authorship on entities beyond the shared record set already carrying
  it.

## Decisions

### D1. One `entities/household` slice per client

Both apps gain an `entities/household` slice: a members query over the
household endpoint (colada on web, TanStack on mobile) cached for
label resolution, plus typed actions wrapping the existing API clients
(invite/revoke/resend, code rotate/revoke, rename, remove, leave,
dissolve, display-name update). No new stores — the existing query
caches suffice; refetch on section open keeps membership fresh without
observers.

### D2. Authorship label resolution

A tiny selector: `authorLabel(row.user_id, members, currentUserId)` →
`null` (no marker: own record, unknown author, or single-member
household) or the member's display name/email. Applied in transaction
rows/details first (the product's center of gravity), and in debtor
history and plan confirm rows where the same data exists. Detail views
additionally show the author line even in single-member households —
the detail is about the record's provenance, the marker is about
collaboration (matches the spec's wording).

### D3. Settings section composition

Mobile: a «Пространство» group in the settings screen (members list,
owner actions as sheets/dialogs per the mobile form conventions). Web:
a household block on the settings page with reka-ui dialogs for
invite/code/rename/dissolve; destructive actions take an explicit
confirm (dissolution also requires typing nothing extra — one confirm
dialog, consistent with delete flows elsewhere). Role-hiding over
disabling per the spec.

### D4. Invitation lifecycle UI

Outgoing list with status chips (pending/expired/revoked/accepted),
resend (refresh) and revoke actions; the invite dialog takes one email
with inline validation. The home code panel shows the code with
copy/rotate/revoke. Deep-link accept UI stays as built in
household-join; this change only links settings to it where natural.

### D5. i18n

Keys under `household.*` and `profile.*` in both apps; RU copy
authoritative, EN mirrors; strict i18n lint on web stays green.

## Risks / Trade-offs

- [Stale member names in labels between household refetches] → cache
  with sensible staleTime + refetch on settings open and app foreground;
  a wrong name is cosmetic, not data.
- [Dissolution reachable too easily] → confirm dialog with the
  household's record counts surfaced («будут удалены N транзакций…»)
  from existing summary endpoints.
- [Two clients drifting on flows] → spec scenarios pin the behaviors;
  review checklist against the twin's tests, as in web-screens-parity.

## Migration Plan

Pure client change; ships independently per app. Rollback = revert.

## Open Questions

(none)
