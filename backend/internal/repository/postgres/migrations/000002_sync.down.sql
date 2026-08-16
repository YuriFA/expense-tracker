DROP INDEX idx_applied_operations_user;
DROP TABLE applied_operations;

DROP INDEX idx_change_log_user_seq;
DROP TABLE change_log;

CREATE OR REPLACE VIEW account_contributions AS
SELECT
    account_id,
    CASE
        WHEN type = 'income'  THEN amount
        WHEN type = 'expense' THEN -amount
    END AS signed
FROM transactions
WHERE type IN ('income', 'expense')
UNION ALL
SELECT from_account_id, -amount AS signed
FROM transactions
WHERE type = 'transfer'
UNION ALL
SELECT to_account_id, amount AS signed
FROM transactions
WHERE type = 'transfer';

DROP INDEX idx_categories_user_name_live;
ALTER TABLE categories
    ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);

ALTER TABLE transactions DROP COLUMN deleted_at;

ALTER TABLE categories
    DROP COLUMN version,
    DROP COLUMN deleted_at;

ALTER TABLE accounts
    DROP COLUMN version,
    DROP COLUMN deleted_at;
