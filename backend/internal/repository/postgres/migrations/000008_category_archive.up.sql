-- Category archive: nullable archived_at (null = active). Archived
-- categories keep labeling existing transactions but are unavailable for
-- new records; no backfill needed (existing rows default to active).

ALTER TABLE categories ADD COLUMN archived_at TIMESTAMPTZ;
