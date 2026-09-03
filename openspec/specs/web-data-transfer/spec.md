# Web Data Transfer Specification

## Purpose

Moving transactions in and out of the web app as spreadsheet-friendly CSV:
filtered and full export, template-based import with a preview, category
auto-creation, and idempotent re-import, all through the local data layer
and available anonymously.

## Requirements

### Requirement: CSV export of transactions

The web app SHALL export transactions to CSV: from the transactions screen
exporting exactly the transactions matching the active filters, and from
the settings data section exporting all transactions. The file SHALL be
`;`-separated UTF-8 CSV with a BOM, decimal-comma amounts, a header row
naming every column (date, type, category, account, amount, note), one
transaction per row, and a file name carrying the export date. Export
SHALL work anonymously and read through the local data repositories.

#### Scenario: Filtered export

- **WHEN** the user filters the transactions screen to one account and a date range and activates export
- **THEN** the downloaded file contains exactly the transactions currently listed

#### Scenario: Full export

- **WHEN** the user activates the full export in the settings data section
- **THEN** the downloaded file contains every non-deleted transaction

#### Scenario: Spreadsheet-friendly encoding

- **WHEN** the exported file is opened in a RU-locale spreadsheet application
- **THEN** Cyrillic text, dates, and decimal-comma amounts render correctly without an import wizard

#### Scenario: Account-less rows

- **WHEN** the exported set contains transactions without an account
- **THEN** their account column is the «Без счета» label

### Requirement: CSV import template

The settings data section SHALL document the import template — columns
date, type, category, amount, note, account — parsed by header name
(Russian or English) rather than position, with `;` separation, decimal
comma, and `DD.MM.YYYY` dates. Type values SHALL be the localized
доход/расход words or their English equivalents; the account column SHALL
match an existing account by name (case-insensitive) or be empty for an
account-less transaction; an unknown account name SHALL be a row error.
Amounts SHALL be major units converted to minor units exactly once at the
row-mapping seam. The empty template SHALL be downloadable from the import
screen.

#### Scenario: Template round-trip

- **WHEN** the user exports transactions and imports the file back
- **THEN** the import preview recognizes every column and reproduces the transactions (existing ids are skipped per the idempotency requirement)

#### Scenario: Unknown account is a row error

- **WHEN** a row names an account that does not exist
- **THEN** the row is reported as invalid in the preview and is not imported

#### Scenario: Header names over positions

- **WHEN** a file reorders the template columns or adds an extra column
- **THEN** rows still parse correctly by header name

### Requirement: Import preview and commit

Import SHALL first parse and validate the whole file and show a preview:
every row with its outcome (valid or the specific error), the list of
categories that would be created (with their type), and a way to exclude
individual valid rows. Only on explicit confirmation SHALL the import
commit: the listed categories are created first, then each included
transaction is written through the local transaction repository, so every
write is outbox-queued and synchronizes after login. The result SHALL be
reported as counts of created, skipped, and rejected rows.

#### Scenario: Preview before any write

- **WHEN** the user picks a file with valid and invalid rows
- **THEN** the preview shows each row's outcome and nothing is written yet

#### Scenario: Categories are visible before creation

- **WHEN** the file contains category names that do not exist
- **THEN** the preview lists them with their type before commit, and they are created on commit

#### Scenario: Excluding rows

- **WHEN** the user excludes a valid row in the preview and commits
- **THEN** that row is not imported and is reported as excluded

#### Scenario: Anonymous import

- **WHEN** an anonymous user imports a file
- **THEN** the transactions are created locally and synchronize once the user logs in and passes the ownership gate

### Requirement: Idempotent re-import

Each imported row SHALL receive a deterministic identifier derived from
its normalized content (date, type, category name, amount, note). Importing
a file whose rows were already imported SHALL skip those rows as
already-imported rather than create duplicates. A row edited in the app
after import SHALL NOT be duplicated or overwritten by re-importing the
unchanged file.

#### Scenario: Re-import is a no-op

- **WHEN** the user imports the same file twice
- **THEN** the second run reports every row as skipped and creates nothing

#### Scenario: Post-import edits survive re-import

- **WHEN** the user edits an imported transaction and then re-imports the original file
- **THEN** the row is skipped and the edit remains
