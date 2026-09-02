## ADDED Requirements

### Requirement: Local category archive and cascade semantics

The local mirror SHALL store each category's archived-at timestamp, and
local reads SHALL follow the listing rules: active categories by default,
archived categories included only on explicit request. Archiving or
unarchiving a category SHALL be a local update mutation enqueuing the
corresponding update sync operation. A cascaded delete SHALL apply in the
local mirror atomically - the category and every non-deleted local
transaction referencing it are tombstoned in one local transaction - and
SHALL enqueue a single delete sync operation carrying the cascade flag.
Local validation SHALL reject assigning an archived category to a
transaction with the archived-category error code, matching the backend.
Transaction counts used by management UIs SHALL be computed from the local
mirror.

#### Scenario: Offline archive

- **WHEN** the user archives a category while offline
- **THEN** the category disappears from pickers immediately and an update sync operation is queued

#### Scenario: Offline cascaded delete

- **WHEN** the user confirms a cascaded delete while offline
- **THEN** the category and its referencing local transactions are tombstoned atomically, balances update immediately, and a single delete operation with the cascade flag is queued

#### Scenario: Local archived-category rejection

- **WHEN** the user assigns an archived category to a new local transaction
- **THEN** the mutation is rejected with the archived-category error code

#### Scenario: Pull applies a remote cascade

- **WHEN** a pull delivers tombstones for a category and its transactions deleted by another device's cascade
- **THEN** the local mirror applies them like any other deletions and balances update accordingly
