## 1. i18n

- [x] 1.1 Add `createTitle`, `createSubmit`, `createSuccess`, `autoColorHint` to the `editCategory` namespace in `packages/i18n/src/locales/ru.json` and `en.json` (key parity)

## 2. Create mode in CategoryEditDialog

- [x] 2.1 Add create mode (`category === null`): seed defaults on open (empty name, default icon, type `expense`), segmented expense/income control instead of the read-only badge, create-branch submit via `useCreateCategory` with `pickCategoryColor`, success notification + close, `typeImmutableHint` hidden
- [x] 2.2 Mode-scoped testids (`create-category-*` in create mode, `edit-category-*` preserved in edit mode) and mode-scoped i18n keys (title/submit/success)

## 3. Screen wiring

- [x] 3.1 Render the page header through the shared `PageHeader` (back to settings + title + subtitle) with a «Создать» button (`actions.create`) in the actions slot that opens `CategoryEditDialog` in create mode

## 4. Tests

- [x] 4.1 Unit tests for the dialog's create mode (renders type control, submits create payload with paired color, success closes) and the page header button
- [x] 4.2 `pnpm type-check`, `pnpm lint`, `pnpm i18n:lint`, `pnpm test:unit`, `pnpm exec steiger src` green; repo `pnpm knip` clean
