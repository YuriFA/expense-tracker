# Design: add-debts

## Context

The backend knows exactly three user-owned entities (account, category,
transaction), each with the same anatomy: Postgres table with `user_id` /
`version` / `deleted_at`, sqlc queries, `withinLockedTx` + `appendChangeLog`
writes, service validation, strict handlers, REST CRUD, and first-class
sync participation (`SyncEntity` enum, push dispatch, pull state, retention).
The mobile app is offline-first: local SQLite (drizzle) is the source of
truth; every entity table carries `version` / `serverVersion` / `deletedAt`,
mutations write row + outbox atomically, and the sync engine
(push → resolve → pull) exhaustively switches on the entity union.
Debts exist nowhere yet; the `goals` route is a placeholder screen behind a
disabled quick action. See proposal.md for motivation; the delta specs pin
the behavior.

Relevant constraints:

- Spec-first: OpenAPI changes precede everything; `make gen` /
  `pnpm gen:api` regenerate both clients of the contract; drift gates in CI.
- Money is int64 minor units at every boundary; mobile forms use digit
  strings converted once at the mapper seam (`parseMajorUnitsToMinor` /
  `minorToInputValue`).
- Mobile FSD: pages don't import each other; single-screen UI stays in the
  page slice; entity data access goes through repository + TanStack hooks;
  `apiClient` may only be touched by session/sync seams.
- Precedent for "records + derived totals": account balances are never
  stored as editable truth — transactions are the records, balances are
  sums. Same philosophy is reused here.

## Goals / Non-Goals

**Goals:**

- Debtors + debt operations as first-class entities across contract,
  backend, `packages/api`, and mobile — indistinguishable in structure and
  guarantees from the existing three.
- The mobile screen works fully offline; balances are always derived from
  local records.
- Already-installed mobile builds survive pulling the new entity kinds.

**Non-Goals:**

- No web UI, no debts-related changes in `apps/web` (the contract change is
  additive; regenerated `schema.ts` must not break web's type-check).
- No accounts/cashflow integration: debt operations do not create
  transactions or move money between accounts.
- No aggregation endpoints (no `/debtors/balances` analog) — clients derive
  totals, consistent with the absence of analytics endpoints.
- No `Idempotency-Key` support on REST creates in v1 — the only offline
  client (mobile) mutates through sync push, which has its own durable
  opId idempotency. Revisit when web builds debt creation UI.
- No i18n wiring; RU strings hardcoded with `TODO(i18n)` markers.

## Decisions

### D1: Domain model — two entities, direction + kind on the operation

`debtor` (id, name, note?, version, timestamps, tombstone) and
`debt_operation` (id, debtor_id, `direction: receivable|payable`,
`kind: debt|repayment`, positive int64 amount, occurred_at, note?, version,
timestamps, tombstone). Balances are derived:
`balance(debtor, direction) = Σ debt − Σ repayment` in that direction,
never stored. A person may hold nonzero balances in both directions; the
ledgers are not netted.

Alternatives rejected: three entities (debtor / debt / repayment — one more
synced entity and one more set of switchgear for nothing); a mutable
balance column on the debtor (every repayment becomes a CAS-conflicting
row edit, and history is lost); a single signed amount per operation
(equivalent math, but the wire format stops being self-describing — a
negative number on `payable` reads as the opposite of the same number on
`receivable`). The chosen shape mirrors the strongest precedent in the
codebase: transactions are `type` + positive amount, and balances are
derived sums.

Direction and kind are immutable on update (precedent: transaction type is
immutable). To fix a misrecorded operation, delete and recreate.

### D2: Over-repayment is data, not an error

The server does not validate operations against the derived balance: with
offline concurrent mutations the balance is a moving target, so any cap
would be racy and would block honest corrections. The mobile form warns
when a repayment exceeds the remaining balance but accepts it; a ledger
balance may therefore be negative and renders with a minus. Spec'd in the
debts capability ("Derived balances", "over-repayment").

### D3: Contract surface — REST parity, sync as a first-class citizen

OpenAPI adds `Debtor` / `DebtOperation` schemas (+ create/update requests
with optional client-generated id and required `version` on update),
paths `/api/debtors`, `/api/debtors/{id}`, `/api/debt-operations`,
`/api/debt-operations/{id}` (operation list filterable by `debtorId`), and
error codes following the existing naming:
`DEBTOR_NOT_FOUND`, `DEBTOR_ALREADY_EXISTS`, `DEBTOR_IN_USE`,
`DEBTOR_VERSION_CONFLICT`, `DEBT_OPERATION_NOT_FOUND`,
`DEBT_OPERATION_VERSION_CONFLICT`, `DEBT_OPERATION_DEBTOR_NOT_FOUND`,
plus `INVALID_PAYLOAD` / `INVALID_REFS` reuse. The `SyncEntity` enum gains
`debtor` and `debt_operation`; `DebtorSyncData` / `DebtOperationSyncData`
join the sync data oneOf. Sync push applies the same validation and
ownership rules as REST with base-version CAS — debt entities ride the
existing per-item result machinery unchanged.

The optional `note` on both entities copies the `Transaction.description`
convention exactly: `TEXT NOT NULL DEFAULT ''` in Postgres; optional with
`default: ""` on create; a plain non-nullable string on update (absent =
keep via Go `*string` → `COALESCE(sqlc.narg(...), note)`, explicit `null` =
400 from the kin-openapi request validator, `""` = clears); stored verbatim
with no server-side trimming (clients trim at the form layer); an update
body with only `version` is rejected (`no fields to update`). REST DELETE
carries no body or version parameter — identical to accounts, categories,
and transactions; delete versioning is internal (D8).

### D4: Storage — one migration, CHECK-constraint extension done online

Backend migration (golang-migrate, sequential pair) adds both tables with
the standard anatomy (uuid pk, `user_id` FK cascade, `version`, timestamps,
`deleted_at`, CHECK constraints for direction/kind and `amount > 0`,
`note TEXT NOT NULL DEFAULT ''` on both tables, partial unique index on
`(user_id, name) WHERE deleted_at IS NULL` — mirroring however categories
enforce live-name uniqueness), index on `(user_id, occurred_at)` and
`(user_id, debtor_id)` for the operation list. The in-use check is a
`HasLiveDebtOperationsForDebtor` query counting only live
(`deleted_at IS NULL`) operations — the exact shape of
`HasLiveTransactionsForCategory`; tombstoned operations never block debtor
deletion. The same migration extends the `change_log.entity` and
`applied_operations.entity` CHECK constraints. `change_log` is append-only
and never pruned, so it may be large: add the new CHECK as `NOT VALID` and
`VALIDATE CONSTRAINT` afterwards to avoid a long ACCESS EXCLUSIVE lock.
Retention gains `DeleteTombstonedDebtOperationsBefore` ordered before the
debtor cleanup (FK order: referencing rows first).

### D5: Pull-side version-skew hardening

Old installed builds exhaustive-switch on the three-entity union; after
the backend ships, their pull will contain `debtor` / `debt_operation`
changes. `applyPullChange` (and the sync-data mappers beneath it) gains a
defensive default: an unknown entity kind is skipped with a log and the
cursor still advances (stalling the cursor would permanently brick sync on
that build). This lands in the same mobile release as the debts feature
itself — the point is the window between backend deploy and user updates.

### D6: Mobile data layer — same anatomy as the existing entities

Local tables `debtors` / `debt_operations` in
`apps/mobile/src/shared/lib/db/schema.ts` with the mandatory sync columns,
`direction` / `kind` as text columns, money integer; extend the `SyncEntity`
union; `pnpm db:generate` produces the drizzle migration (inlined into
`migrations.generated.ts` automatically). The per-entity switches to extend:
`sync-data.ts` (`readEntityRow`, `rowToPayload`, `payloadToSyncData`,
`syncDataToRowPatch`), `sync-engine.ts` (`updateEntityRow`, `insertFromChange`,
+ the D5 default), `outbox.ts`, `conflicts.ts`, `sync-meta.ts`
(`wipeLocalData`). New slice `entities/debt`: local repository (atomic
row + outbox write, local in-use guard for debtor delete,
unborn-wipe-vs-tombstone, `RepositoryError` apiCodes matching D3),
repository provider, TanStack hooks (`useDebtors`, `useDebtOperations`,
mutations), barrel. Register the slice in `ENTITY_SLICES` of
`.dependency-cruiser.mobile.cjs`; compose the provider in `_layout.tsx`.
The debtor local-repository delete guard checks live local operations
(mirroring the category in-use guard).

### D7: Screen — a page slice, cashflow-overview is not stretched

`src/app/debts.tsx` (thin re-export) + `pages/debts/` with
`ui/debts-screen.tsx` and `model/` (selectors + RU copy record, the
`kind.ts` pattern). Single consumer → stays out of `features/` per the FSD
rule; `cashflow-overview` is month-scoped cashflow and is deliberately not
reused (no period switching, no all-operations card — only `Screen`,
`ScreenHeader`, `ScreenScrollView`, cards, sheets, rows are shared UI).
Composition follows invariant #15: the page owns all sheet refs
(history sheet, new/edit operation sheets, the combined contact+debt
sheet, debtor edit sheet) and passes callbacks down. Selectors:
per-direction balances (integer math),
direction totals, day-grouped operation history, settled-debtor partition,
balance-descending sort; display via `formatAmount`.

Performance invariant: loading the debts overview SHALL NOT issue one
operations query per debtor (no N+1). The screen loads the full operations
set through a single `useDebtOperations()` query — the same
one-query-plus-in-memory-selectors shape `categoryBreakdown` uses over
`useTransactions` — and the repository MAY offer a `debtorId`-filtered
query for the history sheet only. Pinned by a test that renders the
overview with several debtors against a mocked repository and asserts a
single operations read.

Visual language mirrors the income screen's: a `SummaryCard`-style card
with two rows («Мне должны» / «Я должен» totals, no period arrows); section
headers «Мне должны» / «Я должен»; `DebtorRow` with an initials avatar on a
color derived from the palette by id hash (no stored color — zero sync
cost), name, balance, chevron. Forms follow `docs/conventions/forms.md`:
RHF + Zod schema in `model/schema.ts`, sheet/form split, amount as digit
string with the shared keypad, `BottomSheetInput`, root-error via
`getRepositoryErrorText`, named `toXxxPayload` mapper doing the single
minor-unit conversion. The operation form's kind switch (Долг ↔ Списание)
reuses the segmented-toggle idiom of the transaction type switch; contact
and direction are fixed context rows (the creation entry points and the
free-form mode they replaced are decided in D9).

The «Цели» quick action becomes «Долги» (`id: 'debts'`, testID
`home-quick-debts`, icon `hand-coins` — add the glyph to the icon set if
missing, else fall back to an existing coins-style glyph; chip stays a
brand accent token per the row's comment). Delete `src/app/goals.tsx`,
`pages/goals/`, and the `goals` `Stack.Screen` entry; update
`docs/product/mobile-home.md` (quick actions become Счета / Доходы / Долги;
debts leaves the "explicitly excluded" list; goals noted as deferred
without a tile) and check `docs/assumptions.md` for goals references.

### D8: Sync edge semantics inherit the generic machinery (precedent map)

Every edge case below is existing, tested behavior for
accounts/categories/transactions; debts copies it verbatim — no new sync
architecture. The spec deltas reference these as shared rules.

- **In-use guard** — live references only (`HasLiveDebtOperationsForDebtor`
  mirrors `HasLiveTransactionsForCategory`); tombstoned operations never
  block. On sync push the guard surfaces as a per-item `DEBTOR_IN_USE`
  error, exactly like `CATEGORY_IN_USE`.
- **Offline operation vs server-deleted debtor** — sync push validates the
  debtor reference against LIVE debtors (mirroring `validateSyncRefs`):
  a tombstoned or missing debtor yields a per-item `error` result with
  `DEBT_OPERATION_DEBTOR_NOT_FOUND` (the `CATEGORY_NOT_FOUND` analog). On
  the client this rides the existing generic path: the outbox row keeps its
  `lastError`, retries under the standard backoff (5 s → 15 min cap, no
  attempt limit), never enters `sync_conflicts`, and is never silently
  discarded; the badge shows it in the pending count. Resolution is user
  action — edit or delete the local operation. Pulling the debtor's
  tombstone independently tombstones the local debtor row (delete-wins) and
  does not touch the queued operation's own record.
- **Debtor-name uniqueness on sync push** — pre-checked under the advisory
  lock via a `DebtorNameTaken` query (mirrors `CategoryNameTaken`) and
  reported as a per-item `DEBTOR_ALREADY_EXISTS` error so the shared batch
  transaction never aborts on the unique index.
- **Entity id vs opId** — `applied_operations` records only APPLIED
  results; redelivery of an applied `opId` replays the stored result
  (never already-exists, never a second record). A different `opId`
  claiming an existing entity id is a `SYNC_ALREADY_EXISTS` conflict
  carrying the server state — never a silent overwrite.
- **Delete versioning** — REST delete takes no version and soft-deletes a
  live row (`version = version + 1`, `deleted_at`, change-log tombstone
  with the new version); tombstoned/missing → not-found. Sync delete is
  idempotent and delete-wins: never-existed → applied(0); already
  tombstoned → applied(current version); live → tombstone → applied(new
  version); in-use → per-item error. A concurrent edit never turns a sync
  delete into a version conflict. Sync upsert against a tombstoned record
  → `SYNC_DELETED_CONFLICT` (client delete-wins flow). REST update of a
  tombstoned record → not-found (deleted equals not-found).
- **Mobile local delete** — tombstones the row (`version + 1`, `deletedAt`)
  and enqueues the delete op with `baseVersion = serverVersion` (the
  confirmed server version, never the local one); unborn records
  (serverVersion 0, nothing sent) hard-delete without outbox traffic —
  the category/transaction local-repository pattern unchanged.

### D9: Creation entry points — per-section «+», no free-form operation form

The initial screen CTA («Новая операция» opening a form with a direction
segmented control and a debtor picker) forced the common flow — "Анна
должна мне 5 000" — through a kind switch, a direction switch, and a
picker before the amount. Revised entry points (UX refinement of the same
intent, not a new capability):

- Each direction section carries a circular «+» affordance opening ONE
  combined form titled by the direction («Кто должен» / «Кому должен»)
  that creates the contact and their initial `debt` in a single submit —
  name, keypad amount, date + note via the transaction form's one-row
  action toolbar. The direction is structural (it comes from the section),
  so no direction switch exists anywhere on the screen; the sections
  render always (empty hints + «+»), replacing the separate empty-state
  placeholder and its «Добавить должника» button.
- Operations for an EXISTING contact are recorded from that contact's
  history sheet («Новая операция», kind defaulting to Долг) — contact and
  direction are fixed context rows there. The free-form create mode
  (direction switch + `debtor-picker-sheet`) is deleted; the picker sheet
  and the standalone create-debtor form go with it (the debtor form
  survives as edit-only, copy renamed to the direction-neutral
  «Контакт»).
- The combined submit chains create-debtor → create-debt-operation
  locally; a retry after a partial failure (contact created, operation
  rejected) reuses the created contact instead of colliding with its own
  duplicate name. The form adds no new query reads, so the D7 one-read
  pin holds.

Rejected: a debtor picker inside the combined form (reintroduces the
branching the revision removes — the history sheet already covers existing
contacts); an empty-state button with an embedded direction switch (the
one place the switch would survive, for one screen state only).

## Risks / Trade-offs

- [Old builds meet unknown sync entities] → D5 skip-and-advance default,
  covered by a sync-engine test feeding a foreign entity kind.
- [Offline operation for a remotely deleted debtor surfaces only as a
  pending count, with no error text] → inherited generic behavior
  (`lastError` is not user-visible today); documented as such in D8 rather
  than fixed with new debts-specific UI — the data is never lost and the
  user resolves it by editing or deleting the local operation.
- [CHECK-constraint migration locks a large change_log] → `ADD CONSTRAINT
  … NOT VALID` + `VALIDATE CONSTRAINT` (D4); migration reviewed for lock
  behavior.
- [Scope spans contract + backend + packages + mobile] → tasks staged with
  drift/arch/test gates between stages (see tasks.md); each stage compiles
  and passes its own gates before the next begins.
- [Derived balances drift between devices] → impossible by construction:
  balances are pure functions of the operation set, which sync converges;
  a selector test pins the derivation (including the both-directions and
  over-repayment cases).
- [Icon glyph missing from the icon set] → task includes the check; any
  lucide-style coins glyph is an acceptable fallback (design-tokens-guard
  constrains colors, not glyph choice).
- [Mobile rollback after the DB migration shipped] → drizzle migrations
  are forward-only; rollback means reverting the app release before the
  migration has run in production — noted in the migration plan, not
  solved by tooling.

## Migration Plan

Order: (1) contract edits + regeneration + drift gates; (2) backend
migration + domain/queries/repository; (3) backend service + transport +
sync dispatch + retention + tests; (4) `packages/api` domain/contracts/
mappers; (5) mobile data layer (schema, migration, sync plumbing, D5
hardening, `entities/debt`) with repository and sync tests green before any
UI; (6) mobile screen, sheets, forms, quick-action swap, goals removal,
Jest + Maestro; (7) docs + `openspec validate`. Backend rollback is the
down migration (additive tables + constraint values); web is untouched
throughout.
