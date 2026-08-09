-- sessions (stateful auth). id is a hex token, NOT a uuid.

-- name: CreateSession :one
INSERT INTO sessions (id, user_id, expires_at)
VALUES ($1, $2, $3)
RETURNING id, user_id, expires_at, created_at, updated_at;

-- name: GetSessionByID :one
SELECT id, user_id, expires_at, created_at, updated_at
FROM sessions
WHERE id = $1 AND expires_at > now();

-- name: ExtendSession :execrows
UPDATE sessions
SET expires_at = $2,
    updated_at = now()
WHERE id = $1 AND expires_at > now();

-- name: DeleteSession :execrows
DELETE FROM sessions WHERE id = $1;

-- name: DeleteSessionsByUser :execrows
DELETE FROM sessions WHERE user_id = $1;

-- name: DeleteSessionsByUserExcept :execrows
DELETE FROM sessions WHERE user_id = $1 AND id <> $2;

-- name: DeleteExpiredSessions :execrows
DELETE FROM sessions WHERE expires_at <= now();

-- name: GetSessionsByUser :many
SELECT id, user_id, expires_at, created_at, updated_at
FROM sessions
WHERE user_id = $1 AND expires_at > now()
ORDER BY created_at DESC;
