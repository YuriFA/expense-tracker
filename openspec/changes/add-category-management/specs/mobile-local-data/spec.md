## ADDED Requirements

### Requirement: Archived categories in local data

The local database SHALL store each category's archived-at timestamp
received via sync or local mutation. Category pickers and any surface
offering a category for a new or edited transaction SHALL exclude
archived categories; transactions and period breakdowns that already
reference archived categories SHALL keep displaying them. Local
validation SHALL reject creating or re-categorizing a transaction to an
archived category with the shared archived-category error code, mirroring
the backend.

#### Scenario: Picker excludes archived categories

- **WHEN** the user opens the category picker on the transaction form and an archived category exists
- **THEN** the archived category is not offered

#### Scenario: Offline archived-category rejection

- **WHEN** the user records a transaction referencing an archived category while offline
- **THEN** the operation is rejected with the archived-category error code

#### Scenario: History keeps archived categories

- **WHEN** the user views per-category lists or period breakdowns containing transactions of an archived category
- **THEN** the archived category and its transactions are displayed
