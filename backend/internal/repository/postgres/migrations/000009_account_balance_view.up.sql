-- Single home for the derived account balance (R2): the five account
-- queries that each repeated the opening + sum(contributions) formula now
-- read account_with_balance instead. Per-transaction contributions stay in
-- the account_contributions view (migration 000002).

CREATE VIEW account_with_balance AS
SELECT
    a.id,
    a.household_id,
    a.user_id,
    a.name,
    a.currency,
    a.opening_balance,
    (a.opening_balance + COALESCE(SUM(c.signed), 0))::bigint AS balance,
    a.created_at,
    a.updated_at,
    a.version,
    a.deleted_at
FROM accounts a
LEFT JOIN account_contributions c ON c.account_id = a.id
GROUP BY a.id;
