-- Planned payments (add-planned-payments change): recurring expense/income
-- rules. Confirmation creates an ordinary transaction (type/account/category
-- from the plan) and advances next_due one period; anchor_date is the series
-- anchor (day-of-month / weekday / month-and-day) so shorter months clamp
-- without poisoning the anchor (31 -> 28/29 -> 31). No occurrence table:
-- created transactions are the only record of executed occurrences, and the
-- next_due advancement committed with each transaction is the dedup marker.

CREATE TABLE planned_payments (
    id           UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type         TEXT   NOT NULL CHECK (type IN ('expense', 'income')),
    amount       BIGINT NOT NULL CHECK (amount > 0),
    name         TEXT   NOT NULL DEFAULT '',
    account_id   UUID   NOT NULL REFERENCES accounts (id),
    category_id  UUID   NOT NULL REFERENCES categories (id),
    next_due     DATE   NOT NULL,
    anchor_date  DATE   NOT NULL,
    regularity     TEXT NOT NULL CHECK (regularity IN ('daily', 'weekly', 'monthly', 'yearly')),
    confirm_mode   TEXT NOT NULL CHECK (confirm_mode IN ('manual', 'auto')),
    reminder       TEXT NOT NULL CHECK (reminder IN ('off', 'day_before', 'on_day')),
    note         TEXT   NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    version      INTEGER NOT NULL DEFAULT 1,
    deleted_at   TIMESTAMPTZ
);

-- Name is intentionally NOT unique (two live "Netflix" plans are legal).
-- The next_due index serves the auto-confirm job's due scan; account/category
-- indexes serve the in-use delete guards. All partial (live rows only).
CREATE INDEX idx_planned_payments_user_next_due  ON planned_payments (user_id, next_due) WHERE deleted_at IS NULL;
CREATE INDEX idx_planned_payments_user_account   ON planned_payments (user_id, account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_planned_payments_user_category  ON planned_payments (user_id, category_id) WHERE deleted_at IS NULL;

-- Sync participation: extend the entity CHECKs on change_log and
-- applied_operations. change_log is append-only and never pruned, so it may
-- be large: add the replacement constraint NOT VALID first (brief ACCESS
-- EXCLUSIVE lock) and validate separately (SHARE UPDATE EXCLUSIVE - does not
-- block concurrent writes).
ALTER TABLE change_log DROP CONSTRAINT change_log_entity_check;
ALTER TABLE change_log
    ADD CONSTRAINT change_log_entity_check
    CHECK (entity IN ('account', 'category', 'transaction', 'debtor', 'debt_operation', 'planned_payment'))
    NOT VALID;
ALTER TABLE change_log VALIDATE CONSTRAINT change_log_entity_check;

ALTER TABLE applied_operations DROP CONSTRAINT applied_operations_entity_check;
ALTER TABLE applied_operations
    ADD CONSTRAINT applied_operations_entity_check
    CHECK (entity IN ('account', 'category', 'transaction', 'debtor', 'debt_operation', 'planned_payment'))
    NOT VALID;
ALTER TABLE applied_operations VALIDATE CONSTRAINT applied_operations_entity_check;
