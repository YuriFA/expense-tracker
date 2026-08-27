-- Household shared data space (household-scoping change, ADR-0002): the
-- scoping key for all shared records moves from user to household. Every
-- existing user gets a personal household of one (owner), and every existing
-- row is stamped with its owner's household in the same migration, so there
-- is no intermediate state where scoping is ambiguous.
--
-- user_id columns on entity rows stay as AUTHORSHIP (who created the row),
-- never trusted from the wire; change_log.user_id becomes the author of the
-- change (the acting member) - the pull payload will need it in change 2.

-- ---------------------------------------------------------------------------
-- households + membership
-- ---------------------------------------------------------------------------
CREATE TABLE households (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE household_members (
    household_id UUID        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role         TEXT        NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (household_id, user_id)
);

-- v1 single-membership guarantee: a user belongs to at most one household
-- (the join flows of change 2 will move memberships, never add a second one).
CREATE UNIQUE INDEX idx_household_members_user ON household_members (user_id);

-- Optional member-facing label; null = never set, consumers fall back to email.
ALTER TABLE users ADD COLUMN display_name TEXT;

-- ---------------------------------------------------------------------------
-- Backfill: one personal household per existing user. The household id IS the
-- owner's user id - a stable, deterministic mapping that makes the row stamps
-- below a plain `SET household_id = user_id`.
-- ---------------------------------------------------------------------------
INSERT INTO households (id) SELECT id FROM users;
INSERT INTO household_members (household_id, user_id, role) SELECT id, id, 'owner' FROM users;

-- ---------------------------------------------------------------------------
-- household_id on the six shared entity tables + the sync plumbing
-- ---------------------------------------------------------------------------
ALTER TABLE accounts ADD COLUMN household_id UUID;
UPDATE accounts SET household_id = user_id;
ALTER TABLE accounts
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT accounts_household_id_fkey FOREIGN KEY (household_id) REFERENCES households (id);

ALTER TABLE categories ADD COLUMN household_id UUID;
UPDATE categories SET household_id = user_id;
ALTER TABLE categories
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT categories_household_id_fkey FOREIGN KEY (household_id) REFERENCES households (id);

ALTER TABLE transactions ADD COLUMN household_id UUID;
UPDATE transactions SET household_id = user_id;
ALTER TABLE transactions
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT transactions_household_id_fkey FOREIGN KEY (household_id) REFERENCES households (id);

ALTER TABLE debtors ADD COLUMN household_id UUID;
UPDATE debtors SET household_id = user_id;
ALTER TABLE debtors
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT debtors_household_id_fkey FOREIGN KEY (household_id) REFERENCES households (id);

ALTER TABLE debt_operations ADD COLUMN household_id UUID;
UPDATE debt_operations SET household_id = user_id;
ALTER TABLE debt_operations
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT debt_operations_household_id_fkey FOREIGN KEY (household_id) REFERENCES households (id);

ALTER TABLE planned_payments ADD COLUMN household_id UUID;
UPDATE planned_payments SET household_id = user_id;
ALTER TABLE planned_payments
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT planned_payments_household_id_fkey FOREIGN KEY (household_id) REFERENCES households (id);

ALTER TABLE change_log ADD COLUMN household_id UUID;
UPDATE change_log SET household_id = user_id;
ALTER TABLE change_log
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT change_log_household_id_fkey FOREIGN KEY (household_id) REFERENCES households (id);

ALTER TABLE applied_operations ADD COLUMN household_id UUID;
UPDATE applied_operations SET household_id = user_id;
ALTER TABLE applied_operations
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT applied_operations_household_id_fkey FOREIGN KEY (household_id) REFERENCES households (id);

-- ---------------------------------------------------------------------------
-- Index swap: scoping indexes re-key from user_id to household_id (user_id
-- stays on the rows as authorship but no longer scopes any query). The
-- live-name unique indexes must constrain names per HOUSEHOLD now.
-- ---------------------------------------------------------------------------
DROP INDEX idx_accounts_user_id;
CREATE INDEX idx_accounts_household_id ON accounts (household_id);

DROP INDEX idx_categories_user_id;
DROP INDEX idx_categories_user_name_live;
CREATE INDEX idx_categories_household_id ON categories (household_id);
CREATE UNIQUE INDEX idx_categories_household_name_live
    ON categories (household_id, name)
    WHERE deleted_at IS NULL;

DROP INDEX idx_transactions_user_occurred_id;
DROP INDEX idx_transactions_user_account;
DROP INDEX idx_transactions_user_category;
DROP INDEX idx_transactions_user_from_acct;
DROP INDEX idx_transactions_user_to_acct;
CREATE INDEX idx_transactions_household_occurred_id
    ON transactions (household_id, occurred_at DESC, id DESC);
CREATE INDEX idx_transactions_household_account   ON transactions (household_id, account_id);
CREATE INDEX idx_transactions_household_category  ON transactions (household_id, category_id);
CREATE INDEX idx_transactions_household_from_acct ON transactions (household_id, from_account_id);
CREATE INDEX idx_transactions_household_to_acct   ON transactions (household_id, to_account_id);

DROP INDEX idx_debtors_user_id;
DROP INDEX idx_debtors_user_name_live;
CREATE INDEX idx_debtors_household_id ON debtors (household_id);
CREATE UNIQUE INDEX idx_debtors_household_name_live
    ON debtors (household_id, name)
    WHERE deleted_at IS NULL;

DROP INDEX idx_debt_operations_user_occurred;
DROP INDEX idx_debt_operations_user_debtor;
CREATE INDEX idx_debt_operations_household_occurred ON debt_operations (household_id, occurred_at DESC, id DESC);
CREATE INDEX idx_debt_operations_household_debtor   ON debt_operations (household_id, debtor_id);

DROP INDEX idx_planned_payments_user_next_due;
DROP INDEX idx_planned_payments_user_account;
DROP INDEX idx_planned_payments_user_category;
CREATE INDEX idx_planned_payments_household_next_due  ON planned_payments (household_id, next_due) WHERE deleted_at IS NULL;
CREATE INDEX idx_planned_payments_household_account   ON planned_payments (household_id, account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_planned_payments_household_category  ON planned_payments (household_id, category_id) WHERE deleted_at IS NULL;

DROP INDEX idx_change_log_user_seq;
CREATE INDEX idx_change_log_household_seq ON change_log (household_id, seq);

-- Push idempotency keys are scoped by household: the PK becomes the pair, so
-- the same client opId in two different households is two independent
-- operations (a global op_id PK would collide across households).
DROP INDEX idx_applied_operations_user;
ALTER TABLE applied_operations
    DROP CONSTRAINT applied_operations_pkey,
    ADD PRIMARY KEY (household_id, op_id);
