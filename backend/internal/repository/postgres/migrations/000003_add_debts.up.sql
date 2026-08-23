-- Debt tracking (add-debts change): debtors (a person the user tracks debts
-- with) and debt operations (ledger records in one of two independent
-- directions - receivable "owed to me" / payable "I owe"). Balances are
-- derived per direction from the live operation history (sum of debt minus
-- repayment); no balance column exists anywhere.

CREATE TABLE debtors (
    id         UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name       TEXT   NOT NULL,
    note       TEXT   NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version    INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ
);

-- Live-name uniqueness among non-deleted debtors (partial index, same shape
-- as idx_categories_user_name_live): a tombstoned name can be recreated.
CREATE UNIQUE INDEX idx_debtors_user_name_live
    ON debtors (user_id, name)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_debtors_user_id ON debtors (user_id);

CREATE TABLE debt_operations (
    id          UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    debtor_id   UUID   NOT NULL REFERENCES debtors (id),
    direction   TEXT   NOT NULL CHECK (direction IN ('receivable', 'payable')),
    kind        TEXT   NOT NULL CHECK (kind IN ('debt', 'repayment')),
    amount      BIGINT NOT NULL CHECK (amount > 0),
    note        TEXT   NOT NULL DEFAULT '',
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    version     INTEGER NOT NULL DEFAULT 1,
    deleted_at  TIMESTAMPTZ
);

-- FK-lookup / listing indexes (listDebtOperations orders by occurred_at DESC,
-- id DESC scoped to a user; per-debtor history filtering).
CREATE INDEX idx_debt_operations_user_occurred ON debt_operations (user_id, occurred_at DESC, id DESC);
CREATE INDEX idx_debt_operations_user_debtor   ON debt_operations (user_id, debtor_id);

-- Sync participation: extend the entity CHECKs on change_log and
-- applied_operations. change_log is append-only and never pruned, so it may
-- be large: add the replacement constraint NOT VALID first (brief ACCESS
-- EXCLUSIVE lock) and validate separately (SHARE UPDATE EXCLUSIVE - does not
-- block concurrent writes).
ALTER TABLE change_log DROP CONSTRAINT change_log_entity_check;
ALTER TABLE change_log
    ADD CONSTRAINT change_log_entity_check
    CHECK (entity IN ('account', 'category', 'transaction', 'debtor', 'debt_operation'))
    NOT VALID;
ALTER TABLE change_log VALIDATE CONSTRAINT change_log_entity_check;

ALTER TABLE applied_operations DROP CONSTRAINT applied_operations_entity_check;
ALTER TABLE applied_operations
    ADD CONSTRAINT applied_operations_entity_check
    CHECK (entity IN ('account', 'category', 'transaction', 'debtor', 'debt_operation'))
    NOT VALID;
ALTER TABLE applied_operations VALIDATE CONSTRAINT applied_operations_entity_check;
