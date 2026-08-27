-- Down for 000006: drop the join-lifecycle objects. Orphaned households and
-- membership swaps performed while 000006 was live are NOT undone (rollback
-- = revert, per the change's migration plan).
DROP TABLE IF EXISTS household_codes;
DROP TABLE IF EXISTS household_invitations;
ALTER TABLE households DROP COLUMN IF EXISTS name;
