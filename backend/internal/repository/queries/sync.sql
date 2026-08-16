-- Sync plumbing: the per-user change-log advisory lock, change_log appends
-- (one row per committed mutation, written in the SAME transaction),
-- applied_operations idempotency, and the cursor pull.

-- name: LockUserChanges :exec
-- Serializes a user's change_log writes for the rest of the transaction: seq
-- values are allocated while the lock is held and the lock releases only at
-- commit, so seq order equals commit-visibility order (no skipped changes for
-- a stored cursor). hashtextextended maps the user id to a bigint lock key.
SELECT pg_advisory_xact_lock(hashtextextended(@user_id::text, 0));

-- name: AppendChangeLog :one
INSERT INTO change_log (user_id, entity, entity_id, action, version)
VALUES (@user_id, @entity, @entity_id, @action, @version)
RETURNING seq;

-- name: GetAppliedOperation :one
SELECT op_id, user_id, entity, entity_id, result, applied_at
FROM applied_operations
WHERE op_id = @op_id AND user_id = @user_id;

-- name: InsertAppliedOperation :exec
INSERT INTO applied_operations (op_id, user_id, entity, entity_id, result)
VALUES (@op_id, @user_id, @entity, @entity_id, @result);

-- name: PullChangeLog :many
-- Cursor pull: everything for the user strictly after after_seq, in seq
-- order, paginated. The caller fetches current entity state for upsert rows.
SELECT seq, entity, entity_id, action, version
FROM change_log
WHERE user_id = @user_id AND seq > @after_seq
ORDER BY seq
LIMIT sqlc.arg('limit');
