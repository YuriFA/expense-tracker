-- categories (household-scoped, unique name among LIVE rows only - the
-- partial unique index ignores tombstones so a deleted name can be recreated).
-- Scoped by household_id everywhere; user_id stays on rows as authorship;
-- deletes are soft (deleted_at tombstone).

-- name: CreateCategory :one
-- id is the optional client-generated id (offline-first clients);
-- archived_at rides along so an offline-archived unborn record syncs as-is.
INSERT INTO categories (id, household_id, user_id, name, type, icon, color, archived_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, user_id, name, type, icon, color, archived_at, created_at, updated_at, version;

-- name: UpdateCategory :one
-- Optimistic concurrency: the WHERE clause includes version = @version (and
-- liveness) so a concurrent update yields zero rows. PATCH fields use
-- COALESCE for nil = keep. archived_action is a tri-state text sentinel:
-- 'keep' leaves archived_at, 'archive' stamps now() server-side, 'clear'
-- unarchives (the PATCH contract carries a boolean, never a timestamp).
UPDATE categories
SET
    name         = COALESCE(sqlc.narg('name'), name),
    type         = COALESCE(sqlc.narg('type'), type),
    icon         = COALESCE(sqlc.narg('icon'), icon),
    color        = COALESCE(sqlc.narg('color'), color),
    archived_at  = CASE sqlc.arg('archived_action')::text
                      WHEN 'archive' THEN now()
                      WHEN 'clear'   THEN NULL
                      ELSE archived_at
                  END,
    version      = version + 1,
    updated_at   = now()
WHERE id = @id AND household_id = @household_id AND deleted_at IS NULL AND version = @version
RETURNING id, user_id, name, type, icon, color, archived_at, created_at, updated_at, version;

-- name: SoftDeleteCategory :one
UPDATE categories
SET deleted_at = now(), version = version + 1, updated_at = now()
WHERE id = $1 AND household_id = $2 AND deleted_at IS NULL
RETURNING version;

-- name: SoftDeleteTransactionsForCategory :many
-- Cascade half of a category delete: tombstone every live transaction of
-- the household referencing the category (balances are derived from live
-- transactions, so they recompute implicitly). Returns id+version per row
-- for the per-record change_log appends.
UPDATE transactions
SET deleted_at = now(), version = version + 1, updated_at = now()
WHERE household_id = $1 AND category_id = $2 AND deleted_at IS NULL
RETURNING id, version;

-- name: GetCategory :one
-- Live read including archived rows (archived categories stay visible to
-- their management UI and to reference validation).
SELECT id, user_id, name, type, icon, color, archived_at, created_at, updated_at, version
FROM categories
WHERE id = $1 AND household_id = $2 AND deleted_at IS NULL;

-- name: GetCategoryAny :one
-- Includes tombstoned rows (sync push + conflict classification).
SELECT id, user_id, name, type, icon, color, archived_at, created_at, updated_at, version, deleted_at
FROM categories
WHERE id = $1 AND household_id = $2;

-- name: GetCategories :many
-- Active-only by default; include_archived flips the archived_at filter for
-- management listings.
SELECT id, user_id, name, type, icon, color, archived_at, created_at, updated_at, version
FROM categories
WHERE
    household_id = @household_id
    AND deleted_at IS NULL
    AND (sqlc.arg('include_archived')::boolean OR archived_at IS NULL)
    AND (sqlc.narg('type')::text IS NULL OR type = sqlc.narg('type'))
ORDER BY created_at, id;

-- name: CategoryNameTaken :one
-- Live-name uniqueness pre-check (race-free under the per-household
-- change-log advisory lock); used by the sync path where a constraint
-- violation would abort the shared batch transaction.
SELECT EXISTS(
    SELECT 1
    FROM categories
    WHERE household_id = @household_id AND name = @name AND deleted_at IS NULL AND id <> sqlc.arg('except_id')
) AS taken;

-- name: HasLiveTransactionsForCategory :one
SELECT EXISTS(
    SELECT 1
    FROM transactions
    WHERE household_id = @household_id AND deleted_at IS NULL AND category_id = @category_id
) AS in_use;

-- name: SyncReplaceCategory :one
-- Full-state CAS upsert from a sync push.
UPDATE categories
SET
    name         = @name,
    type         = @type,
    icon         = @icon,
    color        = @color,
    archived_at  = @archived_at,
    version      = version + 1,
    updated_at   = now()
WHERE id = @id AND household_id = @household_id AND deleted_at IS NULL AND version = @base_version
RETURNING id, user_id, name, type, icon, color, archived_at, created_at, updated_at, version;

-- name: SyncCategoriesByIDs :many
SELECT id, user_id, name, type, icon, color, archived_at, version, deleted_at
FROM categories
WHERE household_id = @household_id AND id = ANY(@ids::uuid[]);
