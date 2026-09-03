## 1. Web export

- [x] 1.1 `features/export-csv/`: CSV builder (BOM, `;`, decimal comma, header row, «Без счета» label, transfers as `перевод` rows) + file download util; unit tests incl. round-trip against the import parser
- [x] 1.2 Transactions screen header export action wired to the active filters (same query/matcher as the list)
- [x] 1.3 Settings data screen full-export action

## 2. Web import

- [x] 2.1 `pages/settings/features/import-csv/`: CSV parser (quotes, `;`, CRLF, BOM; header-name mapping RU/EN), row validation (date `DD.MM.YYYY`, decimal-comma majors → minor units exactly once, доход/расход, account by name or empty → «Без счета»), deterministic row ids; unit tests
- [x] 2.2 Import wizard dialog (pick file → preview with per-row outcomes, categories-to-create list, exclude toggles → commit → result counts); template download
- [x] 2.3 Commit path: create listed categories, then per-row transaction create through the repositories; `TRANSACTION_ALREADY_EXISTS` = skipped; cache invalidation via existing composables
- [x] 2.4 Settings card + route `/settings/data` (mirrors `/settings/categories`)

## 3. Locales & tests

- [x] 3.1 ru/en locales for all new strings (`pnpm i18n:lint` clean)
- [x] 3.2 Web unit tests: parser, row validation, id determinism, wizard state machine (preview/exclude/commit/skip)
- [x] 3.3 E2E sanity in the backendless suite: import a small template file, verify rows in the list, re-import = no duplicates, export reflects imported data

## 4. Legacy data

- [x] 4.1 Throwaway conversion of the legacy pivot table (`1.csv`) into the template (skip balance rows, section totals, and the month-total column; one transaction per day × category cell; 12:00 UTC neutral time) — reviewed by the user, then imported through the feature
