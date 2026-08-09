-- accounts. Every query scopes by user_id (IDOR-safe: a cross-user access
-- returns "not found", never the row). Balance is computed via the
-- account_contributions view (opening + manual + sum(signed)).

-- name: CreateAccount :one
INSERT INTO accounts (user_id, name, currency, opening_balance, manual_adjustment)
VALUES ($1, $2, $3, $4, 0)
RETURNING
    id,
    user_id,
    name,
    currency,
    opening_balance,
    manual_adjustment,
    (opening_balance + manual_adjustment)::bigint AS balance,
    created_at,
    updated_at;

-- name: UpdateAccount :one
-- COALESCE keeps a column unchanged when its narg is NULL (PATCH semantics).
UPDATE accounts
SET
    name              = COALESCE(sqlc.narg('name'), name),
    manual_adjustment = COALESCE(sqlc.narg('manual_adjustment'), manual_adjustment),
    updated_at        = now()
WHERE id = @id AND user_id = @user_id
RETURNING
    id,
    user_id,
    name,
    currency,
    opening_balance,
    manual_adjustment,
    (opening_balance + manual_adjustment + COALESCE(
        (SELECT SUM(c.signed) FROM account_contributions c WHERE c.account_id = accounts.id), 0
    ))::bigint AS balance,
    created_at,
    updated_at;

-- name: DeleteAccount :execrows
DELETE FROM accounts WHERE id = $1 AND user_id = $2;

-- name: GetAccount :one
SELECT
    a.id,
    a.user_id,
    a.name,
    a.currency,
    a.opening_balance,
    a.manual_adjustment,
    (a.opening_balance + a.manual_adjustment + COALESCE(SUM(c.signed), 0))::bigint AS balance,
    a.created_at,
    a.updated_at
FROM accounts a
LEFT JOIN account_contributions c ON c.account_id = a.id
WHERE a.id = $1 AND a.user_id = $2
GROUP BY a.id, a.user_id, a.name, a.currency, a.opening_balance, a.manual_adjustment, a.created_at, a.updated_at;

-- name: GetAccounts :many
SELECT
    a.id,
    a.user_id,
    a.name,
    a.currency,
    a.opening_balance,
    a.manual_adjustment,
    (a.opening_balance + a.manual_adjustment + COALESCE(SUM(c.signed), 0))::bigint AS balance,
    a.created_at,
    a.updated_at
FROM accounts a
LEFT JOIN account_contributions c ON c.account_id = a.id
WHERE a.user_id = $1
GROUP BY a.id, a.user_id, a.name, a.currency, a.opening_balance, a.manual_adjustment, a.created_at, a.updated_at
ORDER BY a.created_at, a.id;

-- name: GetAccountBalances :many
SELECT
    a.id,
    a.user_id,
    a.name,
    a.currency,
    (a.opening_balance + a.manual_adjustment + COALESCE(SUM(c.signed), 0))::bigint AS balance
FROM accounts a
LEFT JOIN account_contributions c ON c.account_id = a.id
WHERE a.user_id = $1
GROUP BY a.id, a.user_id, a.name, a.currency, a.opening_balance, a.manual_adjustment
ORDER BY a.created_at, a.id;
