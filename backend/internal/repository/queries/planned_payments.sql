-- planned_payments (per-user recurring expense/income rules). Name is NOT
-- unique (two live "Netflix" plans are legal). Scoped by user_id everywhere;
-- deletes are soft (deleted_at tombstone). next_due/anchor_date are
-- day-granularity dates; advancement touches next_due only, so the anchor
-- survives clamped months.

-- name: CreatePlannedPayment :one
-- id is the optional client-generated id (offline-first clients). next_due
-- doubles as the initial anchor.
INSERT INTO planned_payments (
    id, user_id, type, amount, name, account_id, category_id,
    next_due, anchor_date, regularity, confirm_mode, reminder, note
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12)
RETURNING id, user_id, type, amount, name, account_id, category_id,
          next_due, anchor_date, regularity, confirm_mode, reminder, note,
          created_at, updated_at, version;

-- name: UpdatePlannedPayment :one
-- Optimistic concurrency: the WHERE clause includes version = @version (and
-- liveness) so a concurrent update yields zero rows. PATCH fields use
-- COALESCE for nil = keep; a non-nil empty name/note clears it. Changing
-- next_due resets the anchor to the same new date.
UPDATE planned_payments
SET
    amount       = COALESCE(sqlc.narg('amount'), amount),
    name         = COALESCE(sqlc.narg('name'), name),
    note         = COALESCE(sqlc.narg('note'), note),
    account_id   = COALESCE(sqlc.narg('account_id'), account_id),
    category_id  = COALESCE(sqlc.narg('category_id'), category_id),
    next_due     = COALESCE(sqlc.narg('next_due'), next_due),
    anchor_date  = COALESCE(sqlc.narg('next_due'), anchor_date),
    regularity   = COALESCE(sqlc.narg('regularity'), regularity),
    confirm_mode = COALESCE(sqlc.narg('confirm_mode'), confirm_mode),
    reminder     = COALESCE(sqlc.narg('reminder'), reminder),
    version      = version + 1,
    updated_at   = now()
WHERE id = @id AND user_id = @user_id AND deleted_at IS NULL AND version = @version
RETURNING id, user_id, type, amount, name, account_id, category_id,
          next_due, anchor_date, regularity, confirm_mode, reminder, note,
          created_at, updated_at, version;

-- name: AdvancePlannedPayment :one
-- Server-side occurrence advancement (auto-confirm job): bumps next_due to
-- the already-computed next occurrence. Optimistic-concurrency-free on
-- purpose - the job runs under the per-user advisory lock and owns the row
-- for the duration of the transaction that creates the payment.
UPDATE planned_payments
SET next_due = @next_due, version = version + 1, updated_at = now()
WHERE id = @id AND user_id = @user_id AND deleted_at IS NULL
RETURNING id, user_id, type, amount, name, account_id, category_id,
          next_due, anchor_date, regularity, confirm_mode, reminder, note,
          created_at, updated_at, version;

-- name: SoftDeletePlannedPayment :one
UPDATE planned_payments
SET deleted_at = now(), version = version + 1, updated_at = now()
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
RETURNING version;

-- name: GetPlannedPayment :one
SELECT id, user_id, type, amount, name, account_id, category_id,
       next_due, anchor_date, regularity, confirm_mode, reminder, note,
       created_at, updated_at, version
FROM planned_payments
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;

-- name: GetPlannedPaymentAny :one
-- Includes tombstoned rows (sync push + conflict classification).
SELECT id, user_id, type, amount, name, account_id, category_id,
       next_due, anchor_date, regularity, confirm_mode, reminder, note,
       created_at, updated_at, version, deleted_at
FROM planned_payments
WHERE id = $1 AND user_id = $2;

-- name: GetPlannedPayments :many
SELECT id, user_id, type, amount, name, account_id, category_id,
       next_due, anchor_date, regularity, confirm_mode, reminder, note,
       created_at, updated_at, version
FROM planned_payments
WHERE
    user_id = @user_id
    AND deleted_at IS NULL
    AND (sqlc.narg('type')::text IS NULL OR type = sqlc.narg('type'))
ORDER BY next_due ASC, id ASC;

-- name: DueAutoPlannedPayments :many
-- The auto-confirm job's due scan: live auto plans whose next occurrence
-- date has arrived (UTC today inclusive).
SELECT id, user_id, type, amount, name, account_id, category_id,
       next_due, anchor_date, regularity, confirm_mode, reminder, note,
       created_at, updated_at, version
FROM planned_payments
WHERE user_id = @user_id
  AND deleted_at IS NULL
  AND confirm_mode = 'auto'
  AND next_due <= @today
ORDER BY next_due ASC, id ASC;

-- name: UsersWithDueAutoPlannedPayments :many
-- Users owning at least one due auto plan (the job's per-user work list).
SELECT DISTINCT user_id
FROM planned_payments
WHERE deleted_at IS NULL
  AND confirm_mode = 'auto'
  AND next_due <= @today;

-- name: HasLivePlannedPaymentsForAccount :one
-- In-use guard counts LIVE plans only: tombstoned plans never block account
-- deletion.
SELECT EXISTS(
    SELECT 1
    FROM planned_payments
    WHERE user_id = @user_id AND deleted_at IS NULL AND account_id = @account_id
) AS in_use;

-- name: HasLivePlannedPaymentsForCategory :one
SELECT EXISTS(
    SELECT 1
    FROM planned_payments
    WHERE user_id = @user_id AND deleted_at IS NULL AND category_id = @category_id
) AS in_use;

-- name: SyncReplacePlannedPayment :one
-- Full-state CAS upsert from a sync push.
UPDATE planned_payments
SET
    type         = @type,
    amount       = @amount,
    name         = @name,
    account_id   = @account_id,
    category_id  = @category_id,
    next_due     = @next_due,
    anchor_date  = @anchor_date,
    regularity   = @regularity,
    confirm_mode = @confirm_mode,
    reminder     = @reminder,
    note         = @note,
    version      = version + 1,
    updated_at   = now()
WHERE id = @id AND user_id = @user_id AND deleted_at IS NULL AND version = @base_version
RETURNING id, user_id, type, amount, name, account_id, category_id,
          next_due, anchor_date, regularity, confirm_mode, reminder, note,
          created_at, updated_at, version;

-- name: SyncPlannedPaymentsByIDs :many
SELECT id, user_id, type, amount, name, account_id, category_id,
       next_due, anchor_date, regularity, confirm_mode, reminder, note,
       version, deleted_at
FROM planned_payments
WHERE user_id = @user_id AND id = ANY(@ids::uuid[]);
