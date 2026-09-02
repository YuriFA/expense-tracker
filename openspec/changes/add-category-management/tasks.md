## 1. Contract (OpenAPI first)

- [x] 1.1 Update `docs/api/openapi.yaml`: `Category.archivedAt` (nullable date-time, in responses and `CategoryUpdateRequest`), `DELETE /api/categories/{id}?cascade=true`, `GET /api/categories?includeArchived=true`, 422 `CATEGORY_ARCHIVED` example on transaction create/update; spec lint (`npx @redocly/cli lint`)
- [x] 1.2 Regenerate: backend `make gen` (+ `make gen-check` clean) and TS types `pnpm gen:api` (packages/api schema.ts committed)

## 2. Backend

- [x] 2.1 Postgres migration: nullable `archived_at` on `categories` (+ sqlc queries); no backfill
- [x] 2.2 Domain (`backend/internal/domain/category.go`): archive/unarchive via update, archived-name uniqueness, archive blocked by live planned payments, cascade delete (tombstone category + referencing non-deleted household transactions atomically), `CATEGORY_ARCHIVED` domain error on transaction create/update referencing an archived category
- [x] 2.3 Handler + service wiring: cascade query param, includeArchived listing param, error mapping (`CATEGORY_ARCHIVED` 422, category-in-use 409), planned-payment create/update reject archived categories
- [x] 2.4 Change-log: one entry per tombstoned record inside the same transaction (invariants #17-#18); sync push handler accepts the cascade flag on category delete ops
- [x] 2.5 Backend tests: archive/unarchive, guarded vs cascaded delete (incl. live-plan block, racing transaction, non-owner member), listing filter, archived-reference validation on transactions and plans

## 3. Shared local data (`packages/local-data`)

- [x] 3.1 Drizzle schema + migration: `categories.archivedAt`; repository listings (active by default, include-archived option)
- [x] 3.2 Category repository: archive/unarchive update path, `remove` cascade branch (one local transaction: category + referencing transactions tombstoned, balances recomputed, single queued delete op with cascade flag), archive blocked by live plans
- [x] 3.3 Transaction repository: reject archived-category assignment with `CATEGORY_ARCHIVED`, allow keeping an already-assigned archived category
- [x] 3.4 Sync engine: delete-op payload carries the cascade flag; pull applies category + transaction tombstones from a server cascade
- [x] 3.5 Package tests: offline archive, offline cascade, pull-applied cascade, archived-reference rejection, unborn-record cascade edge (serverVersion 0 in-flight transactions)

## 4. Mobile (minimum compliance)

- [x] 4.1 Category pickers (create/edit transaction) exclude archived categories; history lists and period breakdowns keep showing them
- [x] 4.2 Local validation surfaces `CATEGORY_ARCHIVED` by code; mobile tests (picker filter, offline rejection)

## 5. Web - design first (Superdesign)

- [x] 5.1 Run the superdesign skill: design the `/settings/categories` screen on the canvas (list grouped by type with icon/color/name/count, archive section, edit dialog with read-only type, hybrid delete dialog with typed confirmation); iterate with the user until approved

## 6. Web - implementation (from approved design)

- [x] 6.1 Settings feature module `pages/settings/features/categories`: route `/settings/categories`, navigation entry in the settings screen, list + archive section wired to local repositories
- [x] 6.2 Edit dialog (name/icon/color, type read-only) with optimistic-concurrency handling (version conflict refetch/retry, already-exists on rename)
- [x] 6.3 Delete flow per spec: plain confirm (unreferenced), hybrid choice with archive default + cascaded delete requiring exact-name typing and showing local counts (transactions, balance impact), live-plan block message, archived-with-transactions direct cascade dialog
- [x] 6.4 Locales (ru/en) for all new strings per the web-locales conventions
- [x] 6.5 Web tests: list rendering + counts, archive/unarchive, delete dialog branching, archived categories excluded from transaction pickers (CategorySelect)

## 7. Verification

- [ ] 7.1 Full gates: `pnpm arch:check`, `pnpm knip`, backend lint+test, web/mobile type-check + tests, `make gen-check`, Redocly lint
- [ ] 7.2 E2E sanity of the cascade against the real backend (create category + transactions, cascade delete, verify balances and second-device pull) in the closest-to-user flow
- [ ] 7.3 `openspec validate add-category-management --strict` passes; update `docs/architecture/invariants.md` enforcement notes if the deletion-guard invariant wording changes
