## Context

The category management screen owns its CRUD dialogs under
`pages/settings/features/categories/`. `CategoryEditDialog.vue` already
takes `category: Category | null` and reseeds its draft fields on open;
creation infra (`useCreateCategory`, `pickCategoryColor`,
`DEFAULT_CATEGORY_ICON`, `CATEGORY_ICONS`) lives in `entities/category`
and is already used by the transaction form's `NewCategoryDialog`
(`features/transaction/add`). The page header is being unified repo-wide
into `shared/ui/page-header` (design-system rule; canvas «Сложные
компоненты» section 11), so the «Создать» button lands in the new
`PageHeader` actions slot.

## Goals / Non-Goals

- Goals: create categories from the management screen with the same
  creation model as everywhere else (emoji pick, auto color).
- Non-Goals: no mobile changes; no API contract changes; no redesign of
  the transaction form's inline creation; no editing of type after
  creation.

## Decisions

- **One dialog, two modes.** `CategoryEditDialog` gains a create mode
  driven by `category === null` (edit keeps the row's category).
  Alternative considered: reusing `NewCategoryDialog` from
  `features/transaction/add` - rejected: it is coupled to the transaction
  form (`emit('created')` selects the category for the draft transaction),
  has no type select, and would add a cross-page-feature import.
- **Type select only in create mode.** Create renders a segmented
  expense/income control (default expense) in place of the read-only type
  badge; the `typeImmutableHint` line renders only in edit mode.
- **Colors stay auto-assigned.** `pickCategoryColor(icon, takenColors)`
  over all existing categories (archived included - they still render in
  charts, so their colors stay taken), same walk as `NewCategoryDialog`.
- **i18n keys under the existing `editCategory` namespace**
  (`createTitle`, `createSubmit`, `createSuccess`, `autoColorHint`) so the
  shared labels (name/icon/type) stay single-sourced; ru and en updated
  together (web-locales parity).

## Risks / Trade-offs

- [Create mode hidden behind the same dialog could regress edit tests] →
  existing `edit-category-*` testids are preserved in edit mode; create
  mode gets `create-category-*` testids.
- [Duplicate creation models (transaction form vs management screen)] →
  both use the same entity-level creation composable and color walk; the
  UI wrappers stay feature-local by design (FSD).

## Migration Plan

Single web deploy; no data migration. Rollback = revert the commit.

## Open Questions

None.
