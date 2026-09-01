-- 000007: adjustment transactions replace accounts.manual_adjustment.
-- Up:
--   * transactions accepts the 'adjustment' type (balance reconciliation);
--     adjustment amount is a nonzero signed value, other types stay positive.
--   * account_contributions gains the adjustment arm (contributes its signed
--     amount on account_id).
--   * accounts.manual_adjustment is dropped: balance = opening + Σ
--     contributions. No production data carries a nonzero adjustment.

ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('income', 'expense', 'transfer', 'adjustment'));
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_sign_check
    CHECK (
        (type = 'adjustment' AND amount <> 0)
        OR (type <> 'adjustment' AND amount > 0)
    );

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
WHERE type = 'transfer' AND deleted_at IS NULL
UNION ALL
SELECT account_id, amount AS signed
FROM transactions
WHERE type = 'adjustment' AND deleted_at IS NULL;

ALTER TABLE accounts DROP COLUMN manual_adjustment;
