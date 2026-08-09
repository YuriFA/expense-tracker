-- Fresh PostgreSQL baseline for expense-tracker.
--
-- One consolidated baseline (not a port of the 9 SQLite migration files):
-- there is no data to preserve (decision: fresh schema + seed), and the SQLite
-- history contained rename-trick migrations that are pointless on Postgres.
--
-- Type mapping (per architecture report section 3.4):
--   PKs       : UUID with DEFAULT gen_random_uuid()
--   money     : BIGINT (int64 minor units; never float/NUMERIC)
--   timestamps: TIMESTAMPTZ, DEFAULT now() (UTC everywhere)
--   enums     : CHECK constraints (portable, easy to alter - not Postgres ENUM)
-- Tokens/hashes (session id, reset-token hash) stay TEXT - they are not UUIDs.

-- gen_random_uuid() is in core since Postgres 13; the extension is a harmless
-- no-op there and makes the schema work on older versions too.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email            TEXT         NOT NULL UNIQUE,
    password_hash    TEXT         NOT NULL,
    email_verified_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sessions (stateful auth; id is a 256-bit crypto/rand hex token, not a UUID)
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
    id         TEXT        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
CREATE TABLE accounts (
    id                UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name              TEXT   NOT NULL,
    opening_balance   BIGINT NOT NULL,
    manual_adjustment BIGINT NOT NULL DEFAULT 0,
    currency          TEXT   NOT NULL CHECK (currency IN ('USD', 'EUR', 'RUB')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts (user_id);

-- ---------------------------------------------------------------------------
-- categories (per-user; unique name within a user)
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
    id         UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name       TEXT   NOT NULL,
    type       TEXT   NOT NULL CHECK (type IN ('income', 'expense')),
    icon       TEXT   NOT NULL,
    color      TEXT   NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

CREATE INDEX idx_categories_user_id ON categories (user_id);

-- ---------------------------------------------------------------------------
-- transactions
--
-- account_id / category_id / from_account_id / to_account_id FKs use the
-- default (NO ACTION, checked at statement end): a direct DELETE of an account
-- or category that is still referenced fails with a FK violation -> 409
-- ACCOUNT_IN_USE / CATEGORY_IN_USE, while DELETE of a user cascades cleanly
-- because the user-scoped transactions are deleted in the same statement.
-- ---------------------------------------------------------------------------
CREATE TABLE transactions (
    id              UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type            TEXT   NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount          BIGINT NOT NULL,
    description     TEXT   NOT NULL DEFAULT '',
    occurred_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    version         INTEGER NOT NULL DEFAULT 1,
    account_id      UUID   REFERENCES accounts (id),
    category_id     UUID   REFERENCES categories (id),
    from_account_id UUID   REFERENCES accounts (id),
    to_account_id   UUID   REFERENCES accounts (id)
);

-- Keyset-cursor index: listTransactions orders by occurred_at DESC, id DESC
-- scoped to a user; this composite index serves that scan directly.
CREATE INDEX idx_transactions_user_occurred_id
    ON transactions (user_id, occurred_at DESC, id DESC);
-- FK-lookup indexes for filtering transactions by account/category.
CREATE INDEX idx_transactions_user_account   ON transactions (user_id, account_id);
CREATE INDEX idx_transactions_user_category  ON transactions (user_id, category_id);
CREATE INDEX idx_transactions_user_from_acct ON transactions (user_id, from_account_id);
CREATE INDEX idx_transactions_user_to_acct   ON transactions (user_id, to_account_id);

-- ---------------------------------------------------------------------------
-- account_contributions: signed per-account delta used to compute balances.
-- Standard UNION ALL; identical to the SQLite view, portable to Postgres.
-- ---------------------------------------------------------------------------
CREATE VIEW account_contributions AS
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

-- ---------------------------------------------------------------------------
-- idempotency_keys (POST /api/transactions idempotency cache)
-- ---------------------------------------------------------------------------
CREATE TABLE idempotency_keys (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key  TEXT        NOT NULL,
    user_id          UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    request_hash     TEXT        NOT NULL,
    status           TEXT        NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    response_status  INTEGER,
    response_headers TEXT,
    response_body    BYTEA,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 day'),
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys (expires_at);

-- ---------------------------------------------------------------------------
-- email_verification_codes (OTP, single active row per user)
-- ---------------------------------------------------------------------------
CREATE TABLE email_verification_codes (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code       TEXT        NOT NULL,
    attempts   INTEGER     NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_user_id ON email_verification_codes (user_id);

-- ---------------------------------------------------------------------------
-- password_reset_tokens (hashed at rest; single-use)
-- ---------------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
    token_hash TEXT        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_user_id ON password_reset_tokens (user_id);
