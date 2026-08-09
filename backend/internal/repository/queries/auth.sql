-- email verification + password reset throttling helpers.
-- Each returns the age in seconds of the most recently issued code/token for a
-- user, or no rows when none exists (the repository maps that to "no active").

-- name: LatestVerificationCodeAgeSeconds :one
SELECT EXTRACT(EPOCH FROM (now() - created_at))::int AS age_seconds
FROM email_verification_codes
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: LatestPasswordResetTokenAgeSeconds :one
SELECT EXTRACT(EPOCH FROM (now() - created_at))::int AS age_seconds
FROM password_reset_tokens
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;
