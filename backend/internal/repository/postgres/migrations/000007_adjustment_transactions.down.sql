-- 000007 down: restore the pre-adjustment schema. Adjustment transactions
-- remain stored rows (their type stays valid); they simply keep contributing
-- through Σ contributions, so balances are preserved for the income/expense/
-- transfer part. accounts.manual_adjustment comes back with its default 0.

ALTER TABLE accounts ADD COLUMN manual_adjustment BIGINT NOT NULL DEFAULT 0;

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

ALTER TABLE transactions DROP CONSTRAINT transactions_amount_sign_check;
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('income', 'expense', 'transfer', 'adjustment'));
