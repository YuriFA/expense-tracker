-- Sync plumbing: the per-household change-log advisory lock, change_log
-- appends (one row per committed mutation, written in the SAME transaction),
-- applied_operations idempotency, and the cursor pull. change_log.user_id and
-- applied_operations.user_id stay on the rows as authorship (the acting
-- member); household_id is the scoping key.

-- name: LockHouseholdChanges :exec
-- Serializes a household's change_log writes for the rest of the transaction:
-- seq values are allocated while the lock is held and the lock releases only
-- at commit, so seq order equals commit-visibility order (no skipped changes
-- for a stored cursor). hashtextextended maps the household id to a bigint
-- lock key.
SELECT pg_advisory_xact_lock(hashtextextended(@household_id::text, 0));

-- name: AppendChangeLog :one
INSERT INTO change_log (household_id, user_id, entity, entity_id, action, version)
VALUES (@household_id, @user_id, @entity, @entity_id, @action, @version)
RETURNING seq;

-- name: GetAppliedOperation :one
SELECT op_id, user_id, entity, entity_id, result, applied_at
FROM applied_operations
WHERE op_id = @op_id AND household_id = @household_id;

-- name: InsertAppliedOperation :exec
INSERT INTO applied_operations (op_id, household_id, user_id, entity, entity_id, result)
VALUES (@op_id, @household_id, @user_id, @entity, @entity_id, @result);

-- name: PullChangeLog :many
-- Cursor pull: everything for the household strictly after after_seq, in seq
-- order, paginated. The caller fetches current entity state for upsert rows.
SELECT seq, entity, entity_id, action, version
FROM change_log
WHERE household_id = @household_id AND seq > @after_seq
ORDER BY seq
LIMIT sqlc.arg('limit');
