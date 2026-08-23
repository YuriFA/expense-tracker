-- Revert debt tracking. Assumes no debt rows remain in change_log /
-- applied_operations (down migrations restore the pre-change state).
ALTER TABLE applied_operations DROP CONSTRAINT applied_operations_entity_check;
ALTER TABLE applied_operations
    ADD CONSTRAINT applied_operations_entity_check
    CHECK (entity IN ('account', 'category', 'transaction'));

ALTER TABLE change_log DROP CONSTRAINT change_log_entity_check;
ALTER TABLE change_log
    ADD CONSTRAINT change_log_entity_check
    CHECK (entity IN ('account', 'category', 'transaction'));

DROP TABLE debt_operations;
DROP TABLE debtors;
