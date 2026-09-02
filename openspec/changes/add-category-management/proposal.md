## Why

The web app has no way to manage categories: no list, no edit, no delete
(only inline creation while adding a transaction). Deleting a category with
history is impossible by design (`CATEGORY_IN_USE` guard), so users are stuck
with categories they no longer want. We need category management on the web
with a safe lifecycle: archive for categories with history, and an explicit
cascade delete for users who accept losing the transactions.

## What Changes

- **Archive** (new concept): a category can be archived via the normal
  update path (`archivedAt` timestamp). Archived categories are unavailable
  for new transactions and planned payments but keep labeling existing ones.
  Unarchive is allowed. Archived categories still reserve their name.
- **Hybrid delete**: deleting an unreferenced category stays a plain guarded
  delete. Deleting a category referenced by transactions (but not by live
  planned payments) offers a choice: archive, or cascade delete - the
  category and every referencing transaction is tombstoned atomically.
  Cascade is available to any household member (accepted product tradeoff:
  shared budget means shared ownership of transaction history).
- **Listing**: category listing returns active categories by default; a
  filter includes archived ones for management UIs.
- **Validation**: assigning an archived category to a transaction (create or
  category change) is rejected with a new `CATEGORY_ARCHIVED` error code;
  keeping an already-assigned archived category on edit is allowed.
- **Live planned payments** block both delete and archive until the plans
  are deactivated or deleted.
- **Web**: new `/settings/categories` screen - list grouped by type with
  icon, color, name, local transaction count, and actions (edit, archive,
  delete). UI is designed in the Superdesign canvas before implementation.
- **Mobile**: minimum compliance only - local schema, pickers, and validation
  respect archive; full mobile management UI is a separate change.
- Offline/local-first: the cascade applies immediately in the local mirror
  and travels as a single flagged delete operation; the server replays it
  atomically.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `categories`: archive lifecycle (archivedAt, visibility rules, unarchive,
  name reservation), planned-payment guard extended to archiving, hybrid
  cascade delete semantics and confirmation surface, listing filter for
  archived, `CATEGORY_ARCHIVED` validation on transaction category
  assignment.
- `sync-protocol`: category delete push operation carries a cascade flag;
  the server applies the cascade atomically and emits tombstones for every
  affected transaction in the change log.
- `planned-payments`: plan create/update reject references to archived
  categories ("live category" now means non-deleted and non-archived).
- `web-screens`: settings screen for category management at
  `/settings/categories`.
- `web-local-data`: local mirror semantics for archive and cascade delete
  (offline cascade in one local transaction, single queued operation,
  locally enforced `CATEGORY_ARCHIVED`, pickers exclude archived).
- `mobile-local-data`: local schema gains `archivedAt`; domain rules reject
  archived-category references locally; category pickers exclude archived.

## Impact

- **OpenAPI** (`docs/api/openapi.yaml` first, then regenerate): `Category`
  gains `archivedAt`; `DELETE /api/categories/{id}` gains `?cascade=true`;
  `GET /api/categories` gains `includeArchived`; new 422 `CATEGORY_ARCHIVED`
  on transaction create/update. Backend `make gen`, TS `pnpm gen:api`.
- **Backend**: Postgres migration (`archived_at`), category domain
  (archive/cascade), atomic cascade with `change_log` entries (invariant
  #17/#18), error mapping for `CATEGORY_ARCHIVED`.
- **packages/local-data**: schema migration, category repository
  (archive/unarchive/cascade mirror), transaction validation.
- **apps/web**: settings feature module, router entry, locales, Superdesign
  pass before implementation.
- **apps/mobile**: pickers and local validation only.
- Category type stays immutable in the web edit UI (create-only field);
  transaction counts for list rows and confirmation dialogs are computed
  locally from the SQLite mirror - no count endpoints.
