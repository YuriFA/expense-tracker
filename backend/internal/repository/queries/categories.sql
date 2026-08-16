-- categories (per-user, unique name among LIVE rows only - the partial unique
-- index ignores tombstones so a deleted name can be recreated). Scoped by
-- user_id everywhere; deletes are soft (deleted_at tombstone).

-- name: CreateCategory :one
-- id is the optional client-generated id (offline-first clients).
INSERT INTO categories (id, user_id, name, type, icon, color)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, user_id, name, type, icon, color, created_at, updated_at, version;

-- name: UpdateCategory :one
-- Optimistic concurrency: the WHERE clause includes version = @version (and
-- liveness) so a concurrent update yields zero rows. PATCH fields use
-- COALESCE for nil = keep.
UPDATE categories
SET
    name       = COALESCE(sqlc.narg('name'), name),
    type       = COALESCE(sqlc.narg('type'), type),
    icon       = COALESCE(sqlc.narg('icon'), icon),
    color      = COALESCE(sqlc.narg('color'), color),
    version    = version + 1,
    updated_at = now()
WHERE id = @id AND user_id = @user_id AND deleted_at IS NULL AND version = @version
RETURNING id, user_id, name, type, icon, color, created_at, updated_at, version;

-- name: SoftDeleteCategory :one
UPDATE categories
SET deleted_at = now(), version = version + 1, updated_at = now()
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
RETURNING version;

-- name: GetCategory :one
SELECT id, user_id, name, type, icon, color, created_at, updated_at, version
FROM categories
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: GetCategoryAny :one
-- Includes tombstoned rows (sync push + conflict classification).
SELECT id, user_id, name, type, icon, color, created_at, updated_at, version, deleted_at
FROM categories
WHERE id = $1 AND user_id = $2;

-- name: GetCategories :many
SELECT id, user_id, name, type, icon, color, created_at, updated_at, version
FROM categories
WHERE
    user_id = @user_id
    AND deleted_at IS NULL
    AND (sqlc.narg('type')::text IS NULL OR type = sqlc.narg('type'))
ORDER BY created_at, id;

-- name: CategoryNameTaken :one
-- Live-name uniqueness pre-check (race-free under the per-user change-log
-- advisory lock); used by the sync path where a constraint violation would
-- abort the shared batch transaction.
SELECT EXISTS(
    SELECT 1
    FROM categories
    WHERE user_id = @user_id AND name = @name AND deleted_at IS NULL AND id <> sqlc.arg('except_id')
) AS taken;

-- name: HasLiveTransactionsForCategory :one
SELECT EXISTS(
    SELECT 1
    FROM transactions
    WHERE user_id = @user_id AND deleted_at IS NULL AND category_id = @category_id
) AS in_use;

-- name: SyncReplaceCategory :one
-- Full-state CAS upsert from a sync push.
UPDATE categories
SET
    name       = @name,
    type       = @type,
    icon       = @icon,
    color      = @color,
    version    = version + 1,
    updated_at = now()
WHERE id = @id AND user_id = @user_id AND deleted_at IS NULL AND version = @base_version
RETURNING id, user_id, name, type, icon, color, created_at, updated_at, version;

-- name: SyncCategoriesByIDs :many
SELECT id, user_id, name, type, icon, color, version, deleted_at
FROM categories
WHERE user_id = @user_id AND id = ANY(@ids::uuid[]);
