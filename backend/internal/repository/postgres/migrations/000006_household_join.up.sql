-- Household join lifecycle (household-join change, ADR-0002): email
-- invitations with single-use accept tokens, a multi-use home join code,
-- and the optional household display name. Join/leave/remove/dissolve move
-- membership rows only - no new columns on the shared entity tables.

-- ---------------------------------------------------------------------------
-- households.name: optional member-facing label. Backfill defaults every
-- existing (personal) household to its owner's email prefix so owners see a
-- meaningful, editable starting name; households created later start NULL
-- and consumers derive the same label from the owner's account.
-- ---------------------------------------------------------------------------
ALTER TABLE households ADD COLUMN name TEXT;
UPDATE households h
SET name = split_part(u.email, '@', 1)
FROM household_members m
JOIN users u ON u.id = m.user_id
WHERE h.id = m.household_id AND m.role = 'owner';

-- ---------------------------------------------------------------------------
-- Invitations: one PENDING invitation per (household, email) - "pending"
-- means not accepted and not revoked (an expired-but-unconsumed invitation
-- is still pending: re-inviting refreshes token/expiry in place). The accept
-- token is a single-use UUID delivered by email; TTL is enforced by the
-- service (7 days), the column just stores the deadline.
-- ---------------------------------------------------------------------------
CREATE TABLE household_invitations (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    email        TEXT        NOT NULL,
    token        UUID        NOT NULL DEFAULT gen_random_uuid(),
    created_by   UUID        NOT NULL REFERENCES users (id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    accepted_at  TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);

-- Refresh-not-duplicate: at most one pending (not accepted, not revoked -
-- expired still counts as pending) invitation per (household, email); the
-- service refreshes the existing row instead of inserting a second one.
-- A partial unique index is the standard way to express "pending".
CREATE UNIQUE INDEX idx_household_invitations_pending_email
    ON household_invitations (household_id, email)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_household_invitations_household_created
    ON household_invitations (household_id, created_at DESC);
CREATE UNIQUE INDEX idx_household_invitations_token
    ON household_invitations (token)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- Home join code: exactly one row per household (household_id PK). Rotate =
-- overwrite code/created_at in place; revoke = set revoked_at. Codes bind no
-- identity by design (family fallback). Active codes are globally unique so
-- a presented code resolves to at most one household.
-- ---------------------------------------------------------------------------
CREATE TABLE household_codes (
    household_id UUID        PRIMARY KEY REFERENCES households (id) ON DELETE CASCADE,
    code         TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_household_codes_active_code
    ON household_codes (code)
    WHERE revoked_at IS NULL;
