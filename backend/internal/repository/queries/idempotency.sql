-- idempotency keys (POST /api/transactions idempotency cache).
-- user_id is a uuid; the idempotency_key value is a client string.

-- name: CreateIdempotencyKey :one
INSERT INTO idempotency_keys (idempotency_key, user_id, request_hash, status, expires_at)
VALUES ($1, $2, $3, 'pending', $4)
RETURNING
    id, idempotency_key, user_id, request_hash, status,
    response_status, response_headers, response_body,
    created_at, updated_at, expires_at;

-- name: UpdateIdempotencyKey :one
UPDATE idempotency_keys
SET
    status           = COALESCE(sqlc.narg('status'), status),
    response_status  = sqlc.narg('response_status'),
    response_headers = COALESCE(sqlc.narg('response_headers'), response_headers),
    response_body    = COALESCE(sqlc.narg('response_body'), response_body),
    updated_at       = now()
WHERE id = @id AND user_id = @user_id
RETURNING
    id, idempotency_key, user_id, request_hash, status,
    response_status, response_headers, response_body,
    created_at, updated_at, expires_at;

-- name: GetIdempotencyByUserAndKey :one
SELECT
    id, idempotency_key, user_id, request_hash, status,
    response_status, response_headers, response_body,
    created_at, updated_at, expires_at
FROM idempotency_keys
WHERE user_id = $1 AND idempotency_key = $2;

-- name: DeleteIdempotencyKey :execrows
DELETE FROM idempotency_keys WHERE id = $1 AND user_id = $2;

-- name: DeleteExpiredIdempotencyKeys :execrows
DELETE FROM idempotency_keys WHERE expires_at <= now();
