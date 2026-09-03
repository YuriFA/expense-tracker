# Web CSV import/export

## Why

Users keep financial history in spreadsheets (a per-day category-totals
table predates the app) and want it inside the app — plus a way to get
data out into a "pretty spreadsheet" on demand. The web app is local-first
(SQLite-WASM → outbox → sync), so import and export can run entirely
client-side against the same repositories every screen uses: no new
endpoints, no OpenAPI changes, works anonymously, syncs after login.

## What Changes

- **Export (CSV)**: a button on the transactions screen exports exactly
  what the current filters show; a full export of all transactions lives in
  the new settings data section. Format: `;`-separated UTF-8 CSV with a
  BOM, decimal comma, and columns date; type; category; account; amount;
  note — opens cleanly in RU-locale Excel and Google Sheets.
- **Import (CSV template)**: the settings data section offers import from
  a documented flat template (columns date; type; category; amount; note;
  account). A preview validates every row (date, amount, type, category,
  account-by-name), lists categories that will be created, lets the user
  exclude rows, and only then commits: missing categories are created,
  transactions are written through the local repositories (outbox-queued,
  idempotent).
- **Idempotent re-import**: each imported row gets a deterministic id
  derived from its content, so importing the same file again skips rows
  already imported instead of duplicating them.
- **Template download**: the import screen offers the empty template for
  download.
- Scope: web only. One legacy spreadsheet is converted into the template
  offline (throwaway script) — pivot layouts like the original table are
  explicitly out of scope for the importer.

## Capabilities

### New Capabilities

- `web-data-transfer`: CSV export format and entry points; CSV template
  import with preview, category auto-creation, and idempotent re-import.

### Modified Capabilities

- `web-screens`: settings gains a data section (import/export) at
  `/settings/data`; the transactions screen header gains an export action
  honoring the active filters.

## Impact

- **apps/web only**: new page-local feature under `pages/settings/`, a
  shared CSV-export feature (two consumers: transactions screen + settings),
  router entry, locales (ru/en). First file-download and file-input
  surfaces in the web app.
- **No backend / OpenAPI changes**: imports write through the existing
  transaction/category repositories (each write outbox-queued); export
  reads through the existing queries. Batched sync push (50/batch) carries
  the imported rows to the server after login.
- Money invariant: template amounts are major units with a decimal
  separator; conversion to int64 minor units happens exactly once, at the
  import row-mapper seam, via the shared money parser. Export formats
  minor units back to a decimal-comma major string at the export seam.
- Depends on `account-less-transactions`: template rows with an empty
  account column import as «Без счета».
