-- Tombstone retention: hard-delete rows that have been soft-deleted longer
-- than the retention window. change_log entries are kept on purpose - pulls
-- serve tombstones from the log alone, so devices offline during the window
-- still converge to the deleted state. Transactions go first: their FKs
-- reference accounts/categories, so those rows can only go once no
-- tombstoned transaction still points at them. Debt operations likewise go
-- before debtors (their FK references debtors).

-- name: DeleteTombstonedTransactionsBefore :execrows
DELETE FROM transactions
WHERE deleted_at IS NOT NULL AND deleted_at < $1;

-- name: DeleteTombstonedCategoriesBefore :execrows
DELETE FROM categories
WHERE deleted_at IS NOT NULL AND deleted_at < $1;

-- name: DeleteTombstonedAccountsBefore :execrows
DELETE FROM accounts
WHERE deleted_at IS NOT NULL AND deleted_at < $1;

-- name: DeleteTombstonedDebtOperationsBefore :execrows
DELETE FROM debt_operations
WHERE deleted_at IS NOT NULL AND deleted_at < $1;

-- name: DeleteTombstonedDebtorsBefore :execrows
DELETE FROM debtors
WHERE deleted_at IS NOT NULL AND deleted_at < $1;
