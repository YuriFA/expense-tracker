# Tasks: unify-category-icons

## 1. Contract and backend (seed removal)

- [x] 1.1 Remove `seedCategories` from the register request in
  `docs/api/openapi.yaml`; run `make gen` (backend) and `pnpm gen:api`
  (from `packages/api` or `apps/web`); commit regenerated types; verify
  `make gen-check` and the redocly lint pass.
- [x] 1.2 Delete `DefaultCategories` + `CategoryTemplate` from
  `backend/internal/domain/seeds.go` (remove the file), the
  `SeedCategories` parameter and seeding branch in
  `internal/repository/postgres/users.go`, and its passing in
  `internal/transport/http/auth.go`.
- [x] 1.3 Rework backend tests that relied on seeding
  (`server_test.go`, `e2e/sync_test.go`, `e2e/adjustment_test.go`) to
  create their categories through the normal category-create path;
  run the backend test suite.

## 2. Mobile canonical icon set

- [x] 2.1 Rewrite
  `apps/mobile/src/entities/category/config/category-appearance.ts`:
  paired `CATEGORY_ICONS` entries `{ icon, color, types }` (30 unique),
  expense/income filtered views, per-type defaults (🛒 / 💼),
  `legacyCategoryIcon` glyph → emoji map, `pickCategoryColor`
  nearest-free walk; remove `CATEGORY_COLORS` and the old Ionicons list.
- [x] 2.2 Switch mobile category icon rendering to emoji text on every
  surface that shows a stored category icon (form, chips, quick bar,
  picker sheet, dashboard/analytics rows), routing stored values through
  `legacyCategoryIcon`; keep `Icon`/Ionicons for UI chrome only.
- [x] 2.3 Category form (`category-form.tsx`): drop the color picker
  controller (color derives from the icon pair), switch the icon picker
  from the horizontal ScrollView strip to a wrapping grid, filter the
  offered icons by the selected type; update `schema.ts` defaults and
  the form tests.
- [x] 2.4 Update mobile tests touching category appearance (form,
  dashboard, analytics, design-tokens guard carve-outs) and run the
  mobile suite (`pnpm --filter mobile test`, type-check).

## 3. Web icon set

- [x] 3.1 Rewrite
  `apps/web/src/entities/category/config/category-appearance.ts` to
  mirror the mobile set (same icons, colors, types, defaults); extend
  `pickCategoryColor` over the typed list; update
  `category-appearance.test.ts`.
- [x] 3.2 Type-filter the icon pickers in `NewCategoryDialog.vue` and
  `CategoryEditDialog.vue` (expense set for expense, income set for
  income; per-type defaults; removed icons render but are not
  preselected); update their tests.
- [x] 3.3 Run the web suite (`pnpm --filter web type-check`, `test`,
  `lint`) and fix fallout (settings page tests, transaction field
  tests).

## 4. Drift guard and wrap-up

- [x] 4.1 Add the web drift-guard test comparing the web icon config to
  the mobile canonical copy (icons, colors, types, defaults) - fails on
  any divergence, modeled on mobile's `design-tokens-sync`.
- [x] 4.2 Run the full workspace gates: `pnpm arch:check`, `pnpm knip`,
  `pnpm lint:design`, backend `make test`/lint; fix fallout.
- [x] 4.3 Validate the change (`openspec validate unify-category-icons`)
  and re-read the delta specs against the implemented behavior.
