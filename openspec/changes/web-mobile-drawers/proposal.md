# Proposal: web-mobile-drawers

## Why

Below 768px the web app already presents a mobile shell (bottom tab bar +
FAB, change `2026-08-31-web-mobile-bottom-nav`), but every overlay surface
still opens as a desktop-style centered dialog. On a phone this wastes the
bottom half of the screen, pushes primary actions out of thumb reach, and
diverges from the RN app, where the identical flows are bottom sheets with
stacked picker sheets (capability specs `mobile-forms`,
`mobile-transaction-edit`). The earlier decision D1 — "dialogs instead of
mobile bottom sheets" (change `2026-08-27-web-screens-parity`) — predates the
mobile shell and is consciously reversed here for overlay presentation only:
navigation stays web-native (routes, links); presentation becomes
viewport-aware. reka-ui 2.10.3 (already installed) ships a full Drawer
primitive, so no new dependency is required.

## What Changes

- On viewports narrower than 768px, modal overlay surfaces — creation/edit
  forms, detail and history lists, the transactions filter panel — are
  presented as bottom-sheet drawers instead of centered dialogs. On viewports
  of 768px and wider the centered dialogs remain exactly as they are today.
- Destructive-confirmation AlertDialogs (delete transaction/account, dissolve
  or leave household, remove member, ownership gate) stay centered dialogs at
  every viewport. The command palette (desktop-only) is unchanged.
- Picker rows inside form overlays — account, category, and date — open a
  picker drawer stacked above the form drawer (RN
  `account/category/date-picker-sheet` parity). The plans form keeps its
  native `<input type="date">`.
- New shared UI primitives in `apps/web/src/shared/ui/`: `drawer/` (reka-ui
  Drawer parts styled like `sheet/`), `responsive-dialog/` (drawer below
  768px, the existing dialog at 768px+), a responsive select variant, and
  `date-field/` (quick-date chips + drawer calendar on phones; Popover +
  Calendar on desktop).
- ~24 overlay call sites migrate to the responsive presentation; desktop
  behavior and its tests are untouched.
- Spec delta for `web-screens`: modify the "Debts screens" and "Mobile parity
  principle" requirements (they currently mandate dialogs over bottom
  sheets), add a "Mobile overlay presentation" requirement.
- Presentation-only: no API/OpenAPI, data, sync, or package-boundary changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-screens`: overlay presentation becomes viewport-aware — below 768px
  overlays are bottom-sheet drawers (with stacked picker drawers and an
  accessibility requirement for the open stack), at 768px+ they stay
  centered dialogs; the debts screens requirement drops its "dialogs instead
  of mobile bottom sheets" clause; the mobile parity principle keeps
  web-native navigation and scopes its presentation idiom by viewport.

## Impact

- `apps/web/src/shared/ui/` — new `drawer/`, `responsive-dialog/`,
  `date-field/`; responsive variant added to `select/`.
- `apps/web/src/entities/{account,category}/ui/` — `AccountSelect` and
  `CategorySelect` switch to the responsive select variant internally (their
  consumers unchanged).
- Dialog call sites across `features/`, `pages/`, `widgets/` (~24 surfaces,
  enumerated in tasks.md §3) — swap to `responsive-dialog`; the add/edit
  transaction forms rewire the date field.
- `apps/web/e2e/` — backendless + PWA specs that assert dialog presentation
  at phone widths.
- `apps/web/docs/` — overlay conventions appended to
  `docs/conventions/vue-patterns.md` §4; UI-kit list in
  `docs/ARCHITECTURE.md`; two code comments citing the superseded D1.
- No backend, OpenAPI, or `packages/*` changes.
