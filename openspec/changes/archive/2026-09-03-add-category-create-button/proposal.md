## Why

The category management screen (`/settings/categories`) deliberately shipped
without a creation affordance: users must open the transaction form (or the
command palette) to create a category, which is undiscoverable from the
management screen itself and awkward when setting up a fresh household's
category list. The approved canvas design («Кошелёк - Управление
категориями» v2) adds a header «Создать» button and a create dialog.

## What Changes

- The category management screen gets a «Создать» button in its page header.
  It opens a create dialog that offers the type (expense/income, segmented),
  name, and icon; the color stays auto-assigned from the pre-paired
  icon-color set (same creation model as the transaction form's
  new-category dialog).
- The edit dialog (`CategoryEditDialog`) gains a create mode - one dialog
  component for the screen's full CRUD. The type remains read-only in edit
  mode.
- Creation from the transaction form dialog and the command palette stays
  unchanged; this change adds an affordance, it does not move the flow.
- Page-header unification on the web (a shared `PageHeader` component) is
  part of the same design effort but is a pure-UI refactor with no spec
  delta; it is tracked by the design-system rule and repo tests, not by
  this change's specs.

## Capabilities

### New Capabilities

### Modified Capabilities

- `web-screens`: the "Category management screen" requirement currently
  states that creating categories from this screen SHALL NOT be offered;
  it changes to require a header creation affordance with a type-selecting
  create dialog.

## Impact

- `apps/web`: `pages/settings/features/categories/ui/CategoryEditDialog.vue`
  (create mode), `CategoriesSettingsPage.vue` (header button),
  `shared/ui/page-header/` (new shared component), i18n catalogs
  (`packages/i18n/src/locales/{ru,en}.json`).
- No API contract changes: creation uses the existing
  `POST /api/categories` path through `useCreateCategory`.
- No mobile changes.
