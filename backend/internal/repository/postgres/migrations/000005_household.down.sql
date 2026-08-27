-- Down of household-scoping: records revert to user-scoping. Acceptable as
-- the rollback of a not-yet-shared system (v1 households are personal, one
-- user each, so user-scoping is equivalent for all live data). Membership,
-- households, and display names are dropped.

DROP INDEX idx_applied_operations_household;
CREATE INDEX idx_applied_operations_user ON applied_operations (user_id);

DROP INDEX idx_change_log_household_seq;
CREATE INDEX idx_change_log_user_seq ON change_log (user_id, seq);

DROP INDEX idx_planned_payments_household_next_due;
DROP INDEX idx_planned_payments_household_account;
DROP INDEX idx_planned_payments_household_category;
CREATE INDEX idx_planned_payments_user_next_due  ON planned_payments (user_id, next_due) WHERE deleted_at IS NULL;
CREATE INDEX idx_planned_payments_user_account   ON planned_payments (user_id, account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_planned_payments_user_category  ON planned_payments (user_id, category_id) WHERE deleted_at IS NULL;

DROP INDEX idx_debt_operations_household_occurred;
DROP INDEX idx_debt_operations_household_debtor;
CREATE INDEX idx_debt_operations_user_occurred ON debt_operations (user_id, occurred_at DESC, id DESC);
CREATE INDEX idx_debt_operations_user_debtor   ON debt_operations (user_id, debtor_id);

DROP INDEX idx_debtors_household_id;
DROP INDEX idx_debtors_household_name_live;
CREATE INDEX idx_debtors_user_id ON debtors (user_id);
CREATE UNIQUE INDEX idx_debtors_user_name_live
    ON debtors (user_id, name)
    WHERE deleted_at IS NULL;

DROP INDEX idx_transactions_household_occurred_id;
DROP INDEX idx_transactions_household_account;
DROP INDEX idx_transactions_household_category;
DROP INDEX idx_transactions_household_from_acct;
DROP INDEX idx_transactions_household_to_acct;
CREATE INDEX idx_transactions_user_occurred_id ON transactions (user_id, occurred_at DESC, id DESC);
CREATE INDEX idx_transactions_user_account     ON transactions (user_id, account_id);
CREATE INDEX idx_transactions_user_category    ON transactions (user_id, category_id);
CREATE INDEX idx_transactions_user_from_acct   ON transactions (user_id, from_account_id);
CREATE INDEX idx_transactions_user_to_acct     ON transactions (user_id, to_account_id);

DROP INDEX idx_categories_household_id;
DROP INDEX idx_categories_household_name_live;
CREATE INDEX idx_categories_user_id ON categories (user_id);
CREATE UNIQUE INDEX idx_categories_user_name_live
    ON categories (user_id, name)
    WHERE deleted_at IS NULL;

DROP INDEX idx_accounts_household_id;
CREATE INDEX idx_accounts_user_id ON accounts (user_id);

ALTER TABLE applied_operations
    DROP CONSTRAINT applied_operations_household_id_fkey,
    DROP COLUMN household_id;
ALTER TABLE change_log
    DROP CONSTRAINT change_log_household_id_fkey,
    DROP COLUMN household_id;
ALTER TABLE planned_payments
    DROP CONSTRAINT planned_payments_household_id_fkey,
    DROP COLUMN household_id;
ALTER TABLE debt_operations
    DROP CONSTRAINT debt_operations_household_id_fkey,
    DROP COLUMN household_id;
ALTER TABLE debtors
    DROP CONSTRAINT debtors_household_id_fkey,
    DROP COLUMN household_id;
ALTER TABLE transactions
    DROP CONSTRAINT transactions_household_id_fkey,
    DROP COLUMN household_id;
ALTER TABLE categories
    DROP CONSTRAINT categories_household_id_fkey,
    DROP COLUMN household_id;
ALTER TABLE accounts
    DROP CONSTRAINT accounts_household_id_fkey,
    DROP COLUMN household_id;

ALTER TABLE users DROP COLUMN display_name;

DROP INDEX idx_household_members_user;
DROP TABLE household_members;
DROP TABLE households;
