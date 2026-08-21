-- users
--
-- Note: user_id scoping is not needed on the user table itself (the PK is the
-- identity). All resource tables (accounts/categories/transactions/sessions/...)
-- scope every query by user_id (IDOR protection - see their query files).

-- name: GetUserByEmail :one
SELECT
    id,
    email,
    password_hash,
    (email_verified_at IS NOT NULL)::boolean AS email_verified,
    created_at,
    updated_at
FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT
    id,
    email,
    '' AS password_hash,
    (email_verified_at IS NOT NULL)::boolean AS email_verified,
    created_at,
    updated_at
FROM users
WHERE id = $1;
