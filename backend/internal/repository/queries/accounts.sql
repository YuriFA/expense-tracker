-- accounts. Every query scopes by household_id (IDOR-safe: an access from
-- outside the household returns "not found", never the row). user_id stays on
-- the rows as authorship (stamped from the session on create). Balance is
-- computed via the account_contributions view (opening + manual + sum(signed)).
-- Deletes are soft (deleted_at tombstone); every read path that feeds
-- listings/summaries filters tombstones, while the *Any reads (sync + conflict
-- classification) include them.

-- name: CreateAccount :one
-- id is the optional client-generated id (offline-first clients).
INSERT INTO accounts (id, household_id, user_id, name, currency, opening_balance)
VALUES ($1, $2, $3, $4, $5, 0)
RETURNING
    id,
    user_id,
    name,
    currency,
    opening_balance,
    manual_adjustment,
    (opening_balance + manual_adjustment)::bigint AS balance,
    created_at,
    updated_at,
    version;

-- name: UpdateAccount :one
-- Optimistic concurrency: the WHERE clause includes version = @version (and
-- liveness) so a concurrent update yields zero rows. COALESCE keeps a column
-- unchanged when its narg is NULL (PATCH semantics).
UPDATE accounts
SET
    name              = COALESCE(sqlc.narg('name'), name),
    manual_adjustment = COALESCE(sqlc.narg('manual_adjustment'), manual_adjustment),
    version           = version + 1,
    updated_at        = now()
WHERE id = @id AND household_id = @household_id AND deleted_at IS NULL AND version = @version
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
    updated_at,
    version;

-- name: SoftDeleteAccount :one
-- Tombstone (never a hard DELETE): excluded from listings, retained for sync.
UPDATE accounts
SET deleted_at = now(), version = version + 1, updated_at = now()
WHERE id = $1 AND household_id = $2 AND deleted_at IS NULL
RETURNING version;

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
    a.updated_at,
    a.version
FROM accounts a
LEFT JOIN account_contributions c ON c.account_id = a.id
WHERE a.id = $1 AND a.household_id = $2 AND a.deleted_at IS NULL
GROUP BY a.id, a.user_id, a.name, a.currency, a.opening_balance, a.manual_adjustment, a.created_at, a.updated_at, a.version;

-- name: GetAccountAny :one
-- Includes tombstoned rows; used by sync push (serverState / idempotent
-- delete) and REST conflict classification.
SELECT
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
    updated_at,
    version,
    deleted_at
FROM accounts
WHERE id = $1 AND household_id = $2;

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
    a.updated_at,
    a.version
FROM accounts a
LEFT JOIN account_contributions c ON c.account_id = a.id
WHERE a.household_id = $1 AND a.deleted_at IS NULL
GROUP BY a.id, a.user_id, a.name, a.currency, a.opening_balance, a.manual_adjustment, a.created_at, a.updated_at, a.version
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
WHERE a.household_id = $1 AND a.deleted_at IS NULL
GROUP BY a.id, a.user_id, a.name, a.currency, a.opening_balance, a.manual_adjustment
ORDER BY a.created_at, a.id;

-- name: HasLiveTransactionsForAccount :one
-- In-use guard for deletion: any non-deleted transaction referencing the
-- account (as cashflow account or transfer endpoint) blocks the tombstone.
SELECT EXISTS(
    SELECT 1
    FROM transactions
    WHERE household_id = @household_id
      AND deleted_at IS NULL
      AND (account_id = @account_id OR from_account_id = @account_id OR to_account_id = @account_id)
) AS in_use;

-- name: SyncReplaceAccount :one
-- Full-state CAS upsert from a sync push: applies only on the exact base
-- version of a live row; version increments by one.
UPDATE accounts
SET
    name              = @name,
    currency          = @currency,
    opening_balance   = @opening_balance,
    manual_adjustment = @manual_adjustment,
    version           = version + 1,
    updated_at        = now()
WHERE id = @id AND household_id = @household_id AND deleted_at IS NULL AND version = @base_version
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
    updated_at,
    version;

-- name: SyncAccountsByIDs :many
-- Batch fetch for pull data (current state of records named by change rows).
SELECT
    id,
    user_id,
    name,
    currency,
    opening_balance,
    manual_adjustment,
    created_at,
    updated_at,
    version,
    deleted_at
FROM accounts
WHERE household_id = @household_id AND id = ANY(@ids::uuid[]);
