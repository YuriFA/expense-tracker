-- transactions. Scoped by user_id everywhere (IDOR protection).
--
-- The keyset-cursor index transactions(user_id, occurred_at DESC, id DESC)
-- serves ListTransactions directly.

-- name: CreateTransaction :one
INSERT INTO transactions (
    user_id, type, amount, description, occurred_at,
    account_id, category_id, from_account_id, to_account_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING
    id, user_id, type, amount, description, occurred_at,
    created_at, updated_at, version,
    account_id, category_id, from_account_id, to_account_id;

-- name: UpdateTransaction :one
-- Optimistic concurrency: the WHERE clause includes version = @version so a
-- concurrent update yields zero rows (-> not found / version conflict).
-- version is incremented atomically; PATCH fields use COALESCE for nil = keep.
UPDATE transactions
SET
    amount           = COALESCE(sqlc.narg('amount'), amount),
    description      = COALESCE(sqlc.narg('description'), description),
    occurred_at      = COALESCE(sqlc.narg('occurred_at'), occurred_at),
    account_id       = COALESCE(sqlc.narg('account_id'), account_id),
    category_id      = COALESCE(sqlc.narg('category_id'), category_id),
    from_account_id  = COALESCE(sqlc.narg('from_account_id'), from_account_id),
    to_account_id    = COALESCE(sqlc.narg('to_account_id'), to_account_id),
    version          = version + 1,
    updated_at       = now()
WHERE id = @id AND user_id = @user_id AND version = @version
RETURNING
    id, user_id, type, amount, description, occurred_at,
    created_at, updated_at, version,
    account_id, category_id, from_account_id, to_account_id;

-- name: DeleteTransaction :execrows
DELETE FROM transactions WHERE id = $1 AND user_id = $2;

-- name: GetTransaction :one
SELECT
    id, user_id, type, amount, description, occurred_at,
    created_at, updated_at, version,
    account_id, category_id, from_account_id, to_account_id
FROM transactions
WHERE id = $1 AND user_id = $2;

-- name: ListTransactions :many
-- Keyset cursor pagination (occurred_at DESC, id DESC). Each optional filter is
-- applied only when its narg is non-NULL. The account filter matches a
-- transaction if ANY of its account refs (account_id / from / to) equals it,
-- preserving the original OR-across-refs semantics.
SELECT
    id, user_id, type, amount, description, occurred_at,
    created_at, updated_at, version,
    account_id, category_id, from_account_id, to_account_id
FROM transactions
WHERE
    user_id = @user_id
    AND (sqlc.narg('type')::text IS NULL OR type = sqlc.narg('type'))
    AND (
        sqlc.narg('account_id')::uuid IS NULL
        OR account_id = sqlc.narg('account_id')
        OR from_account_id = sqlc.narg('account_id')
        OR to_account_id = sqlc.narg('account_id')
    )
    AND (sqlc.narg('category_id')::uuid IS NULL OR category_id = sqlc.narg('category_id'))
    AND (sqlc.narg('from_date')::timestamptz IS NULL OR occurred_at >= sqlc.narg('from_date'))
    AND (sqlc.narg('to_date')::timestamptz IS NULL OR occurred_at <= sqlc.narg('to_date'))
    AND (
        sqlc.narg('cursor_occurred_at')::timestamptz IS NULL
        OR occurred_at < sqlc.narg('cursor_occurred_at')
        OR (occurred_at = sqlc.narg('cursor_occurred_at') AND id < sqlc.narg('cursor_id'))
    )
ORDER BY occurred_at DESC, id DESC
LIMIT sqlc.arg('limit');
