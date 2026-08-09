-- categories (per-user, unique name within user). Scoped by user_id everywhere.

-- name: CreateCategory :one
INSERT INTO categories (user_id, name, type, icon, color)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, name, type, icon, color, created_at, updated_at;

-- name: UpdateCategory :one
UPDATE categories
SET
    name       = COALESCE(sqlc.narg('name'), name),
    type       = COALESCE(sqlc.narg('type'), type),
    icon       = COALESCE(sqlc.narg('icon'), icon),
    color      = COALESCE(sqlc.narg('color'), color),
    updated_at = now()
WHERE id = @id AND user_id = @user_id
RETURNING id, user_id, name, type, icon, color, created_at, updated_at;

-- name: DeleteCategory :execrows
DELETE FROM categories WHERE id = $1 AND user_id = $2;

-- name: GetCategory :one
SELECT id, user_id, name, type, icon, color, created_at, updated_at
FROM categories
WHERE id = $1 AND user_id = $2;

-- name: GetCategories :many
SELECT id, user_id, name, type, icon, color, created_at, updated_at
FROM categories
WHERE
    user_id = @user_id
    AND (sqlc.narg('type')::text IS NULL OR type = sqlc.narg('type'))
ORDER BY created_at, id;
