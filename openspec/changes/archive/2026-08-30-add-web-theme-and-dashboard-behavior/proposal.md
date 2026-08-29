## Why

The direction-D web restyle (c8cb2823..HEAD) shipped three user-facing behaviors that no
openspec capability describes: the persisted light/dark/system theme setting, the dashboard
month navigator with month-scoped figures, and day-level occurrence-date selection in
transaction creation. This change captures that behavior in the specs retroactively — the
implementation already exists — so the specs remain the source of truth for current product
behavior. One deliberate correction is folded in: the dashboard category breakdown card
ignores the period navigator today, and will be aligned with the other month-scoped figures.

## What Changes

- New capability `web-theme`: the web app's appearance setting — `light`/`dark`/`system`
  values with `light` as the default, per-browser persistence, live system-preference
  following in `system` mode, and startup application before the first paint.
- Modified capability `web-screens`:
  - a new Dashboard screen requirement: card composition, month period navigation, and which
    dashboard figures are period-scoped versus period-independent snapshots;
  - a new requirement that transaction creation forms let the user choose the occurrence
    date at day level, defaulting to now, with the dialog-open clock time preserved.
- One code correction during apply: `CategoryBreakdownCard` currently always shows the
  current month; it will follow the dashboard period cursor like the income/expense stats
  and recent transactions already do.

## Capabilities

### New Capabilities

- `web-theme`: web app theme behavior — the appearance setting offered in settings, its
  persistence, `system` mode's live OS-preference following, and flash-free startup
  application.

### Modified Capabilities

- `web-screens`: adds two requirements — Dashboard screen (composition, month navigation,
  period-scoped vs snapshot figures) and Transaction occurrence date at creation (day-level
  picker semantics shared by expense/income/transfer and quick income forms).

## Impact

- Specs: new `openspec/specs/web-theme/spec.md`; requirements added to
  `openspec/specs/web-screens/spec.md`.
- Code: `apps/web/src/pages/dashboard/ui/CategoryBreakdownCard.vue` (accept the period range
  from the page instead of pinning the current month) and the corresponding wiring in
  `DashboardPage.vue` plus unit tests. No API, backend, mobile, or shared-package changes;
  the OpenAPI contract is untouched.
