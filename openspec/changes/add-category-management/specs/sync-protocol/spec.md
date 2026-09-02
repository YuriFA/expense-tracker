## ADDED Requirements

### Requirement: Cascading category deletion over sync

A pushed delete operation for a category MAY carry a cascade flag. On
applying a cascaded delete, the server SHALL, within the same database
transaction, tombstone the category and every non-deleted transaction of
the household referencing it, and append a change-log entry for every
tombstoned record. Devices SHALL learn of each individual transaction
tombstone through pull exactly as if the transactions had been deleted one
by one, and per-record conflict resolution (delete-wins) SHALL apply to
each of them independently. Transactions created by other devices that
reference the category and land on the server before the cascaded delete is
applied SHALL be tombstoned by the cascade as well.

#### Scenario: Pushed cascaded delete

- **WHEN** a device pushes a category delete operation carrying the cascade flag
- **THEN** the server tombstones the category and all referencing non-deleted transactions atomically, records a change-log entry for each, and the push item is reported as applied

#### Scenario: Other devices receive individual tombstones

- **WHEN** another device pulls after a cascaded delete was applied
- **THEN** it receives the category tombstone and one tombstone per deleted transaction, and applies them like any other deletions

#### Scenario: Racing transaction from another device

- **WHEN** another device pushed a transaction referencing the category and the cascaded delete arrives after that push
- **THEN** the cascade tombstones that transaction together with the rest
