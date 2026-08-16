-- Sync support for offline-first mobile clients (mobile-offline-first phase 2):
-- soft deletes (tombstones), optimistic-concurrency versions on accounts and
-- categories, a transactional change-log for cursor pulls, and persistent
-- applied-operation idempotency for pushes.
--
-- change_log.seq ordering invariant: seq values are allocated while the
-- mutating transaction holds a per-user advisory lock
-- (pg_advisory_xact_lock(hash(user_id))) that is released only at commit, so
-- for any user, seq order equals commit-visibility order and a pull with a
-- stored cursor can never skip a change with an earlier seq. Rolled-back
-- transactions may burn seq values (gaps); gaps are harmless.

-- Accounts/categories gain the transaction-style version + tombstone column.
ALTER TABLE accounts
    ADD COLUMN deleted_at TIMESTAMPTZ,
    ADD COLUMN version    INTEGER NOT NULL DEFAULT 1;

ALTER TABLE categories
    ADD COLUMN deleted_at TIMESTAMPTZ,
    ADD COLUMN version    INTEGER NOT NULL DEFAULT 1;

ALTER TABLE transactions
    ADD COLUMN deleted_at TIMESTAMPTZ;

-- The per-user unique category name must only constrain LIVE categories, so a
-- tombstoned name can be recreated (restore-as-new-record). Replace the
-- table-level UNIQUE with a partial unique index.
ALTER TABLE categories DROP CONSTRAINT categories_user_id_name_key;
CREATE UNIQUE INDEX idx_categories_user_name_live
    ON categories (user_id, name)
    WHERE deleted_at IS NULL;

-- Balances must ignore tombstoned transactions.
CREATE OR REPLACE VIEW account_contributions AS
SELECT
    account_id,
    CASE
        WHEN type = 'income'  THEN amount
        WHEN type = 'expense' THEN -amount
    END AS signed
FROM transactions
WHERE type IN ('income', 'expense') AND deleted_at IS NULL
UNION ALL
SELECT from_account_id, -amount AS signed
FROM transactions
WHERE type = 'transfer' AND deleted_at IS NULL
UNION ALL
SELECT to_account_id, amount AS signed
FROM transactions
WHERE type = 'transfer' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- change_log: one row per committed entity mutation, written in the same DB
-- transaction as the mutation (pull feed for sync clients). version is the
-- record's server version AT THE TIME of the change so a client replaying the
-- stream applies monotonically increasing revisions per record.
-- ---------------------------------------------------------------------------
CREATE TABLE change_log (
    seq        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entity     TEXT   NOT NULL CHECK (entity IN ('account', 'category', 'transaction')),
    entity_id  UUID   NOT NULL,
    action     TEXT   NOT NULL CHECK (action IN ('upsert', 'tombstone')),
    version    INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_log_user_seq ON change_log (user_id, seq);

-- ---------------------------------------------------------------------------
-- applied_operations: durable opId idempotency for sync pushes. Written in
-- the same transaction as the applied mutation; a recorded opId always
-- corresponds to an applied change and replays its stored result.
-- ---------------------------------------------------------------------------
CREATE TABLE applied_operations (
    op_id      UUID   PRIMARY KEY,
    user_id    UUID   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entity     TEXT   NOT NULL CHECK (entity IN ('account', 'category', 'transaction')),
    entity_id  UUID   NOT NULL,
    result     JSONB  NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applied_operations_user ON applied_operations (user_id);
