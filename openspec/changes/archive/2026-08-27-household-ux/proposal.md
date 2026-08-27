# Proposal: household-ux

## Why

`household-scoping` and `household-join` delivered the model and the
flows, but the everyday interface still behaves as if the user were
alone: no way to see or manage the household, no visibility of who
created what in the shared data, and the display name (needed for those
labels) has no editor. This change makes membership a visible, managed
part of both clients — the last step of household v1.

## What Changes

- **Household section in settings (both clients)**: current household
  with its display name (owner-editable), member list (name/email, role,
  joined date), owner actions — invite by email, manage the home code
  (show/copy/rotate/revoke), remove members, dissolve — and the member
  actions: leave (confirm), join-by-code entry.
- **Pending-invitation management**: the owner sees outgoing invitations
  (email, status, expiry) and can revoke or resend.
- **Authorship in shared data**: records authored by another member show
  a «кем записано» label — in record details always, and as a small
  marker in lists and rows, shown only when the household has more than
  one member; own records and anonymous-era records show no marker.
- **Profile: display name editor** in settings («Как вас видят
  участники»), with the email fallback preview.
- **Household awareness**: the app header/settings surface the household
  name subtly (e.g. account menu), reinforcing which space the user is
  in; single-member households show nothing extra.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `household`: adds the interface-level requirements — member/invitation
  management surfaces, authorship labels in shared data, and the display
  name editing UX (the data-level requirements already exist from the
  previous two changes).
- `web-screens`: the settings screen gains the household section (screen
  inventory extension of the parity contract).

## Impact

- `apps/web` + `apps/mobile`: settings screens (household section,
  profile name), list/row markers and detail labels for authorship,
  member-name resolution (household endpoint cache), i18n keys (RU
  authoritative + EN).
- `packages/local-data`: none (authorship already stored by
  household-join).
- Backend/OpenAPI: none (all endpoints exist after household-join).
- Tests: unit tests per screen (mock repositories/clients), backendless
  e2e for the settings section and authorship labels (multi-member
  fixture), i18n parity.
