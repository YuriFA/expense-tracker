-- users
--
-- Note: scoping is not needed on the user table itself (the PK is the
-- identity). All resource tables scope every query by household_id (IDOR
-- protection - see their query files).

-- name: GetUserByEmail :one
SELECT
    id,
    email,
    password_hash,
    (email_verified_at IS NOT NULL)::boolean AS email_verified,
    display_name,
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
    display_name,
    created_at,
    updated_at
FROM users
WHERE id = $1;

-- name: UpdateUserDisplayName :one
-- Profile edit: sets the member-facing display name. Non-empty trimmed and
-- length-capped by the service layer before it gets here.
UPDATE users
SET display_name = $2,
    updated_at   = now()
WHERE id = $1
RETURNING
    id,
    email,
    (email_verified_at IS NOT NULL)::boolean AS email_verified,
    display_name,
    created_at,
    updated_at;
