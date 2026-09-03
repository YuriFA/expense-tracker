# Design: account-less transactions

## Context

Storage layers already tolerate a NULL `account_id` everywhere: the Postgres
`transactions.account_id` column has no NOT NULL, the local SQLite (drizzle)
schema is nullable, the OpenAPI `Transaction`/`TransactionSyncData` responses
mark it nullable, and Go/TS domain structs use pointers / accept null. The
prohibition lives purely in validation layers: backend REST `validateRefs`,
backend sync `validateSyncRefs`, `packages/local-data`
`validateReferences`, the TS normalizer (`normalizeCashflowTransaction`
returns null without an accountId), and the zod form schemas. Balances are
computed per account from the `account_contributions` view (a NULL-account
row never joins an account and silently contributes to nothing), while
period/category analytics are computed client-side over the transaction list
by type + date — so account-less rows drop out of balances and land in
analytics with zero query changes.

## Goals / Non-Goals

- Goal: first-class «Без счета» for income/expense, across REST, sync, local
  mirror, and web forms.
- Goal: keep balances meaningful — an account-less transaction touches no
  balance, ever.
- Non-goal: account-less transfers or adjustments (a transfer moves money
  between two real accounts; an adjustment exists to correct one account's
  balance).
- Non-goal: mobile form UI (follow-up; shared layers comply now so mobile
  devices can pull and display such rows).

## Decisions

### D1. Nullable `accountId` over a system «Без счета» account

Rejected alternatives:
- *Hidden system account per household*: zero validation changes, but a
  meaningless balance (drifts negative with every expense), pollutes account
  lists/filters, needs a marker column + migration + hide-from-totals logic.
- *Assigning history to a normal account*: zero feature work, but
  permanently falsifies per-account balances and blocks future account-less
  entry.

Chosen: relax the validation layers. Cost is ~5 seams (two backend
validators, one local validator, one normalizer, form schemas), no
migrations, and the domain stays honest: «вне счетов» is not a счет.

### D2. Balances exclude, analytics include (deliberate divergence)

Total balance = Σ account balances (server-computed `opening_balance +
Σ contributions`), so account-less flows are invisible there by design:
they are budget history, not money in a known place. Period income/expense
totals and category breakdowns are computed client-side over transactions
(type + date only) and therefore include them unchanged. This asymmetry is
the product decision, not an accident.

### D3. Currency display falls back to the app default

An account-less row has no currency of its own. The web row/form already
fall back to `DEFAULT_CURRENCY` (RUB) when the account lookup misses, and
the debts capability already displays currency-less records in rubles
(`app-currency` spec). We reuse that fallback; no currency field is added.

### D4. REST PATCH is set-only for `accountId`; clearing goes through sync replace

oapi-codegen maps an optional object field to a single `*uuid.UUID`: JSON
`null` and an absent key both decode to a nil pointer, so a PATCH cannot
distinguish "leave unchanged" from "clear". Adding a null-vs-absent wrapper
type through transport + service params would complicate one consumer (the
REST PATCH) that no first-party client uses for transaction edits: both
apps are local-first and push edits as full-state sync replaces
(`ReplaceTransaction` applies the whole reference set, null included).
Decision: PATCH `accountId` sets or leaves unchanged (documented in
OpenAPI wording); clearing happens via the local-first edit path (local row
`accountId = null`, queued full-state upsert, sync replace applies it).
The local patch (`TransactionPatch`) DOES carry `accountId: null` —
`patch.accountId !== undefined` already distinguishes absent from null in
TS, so the local mirror and outbox handle clearing without changes.

### D5. Update semantics

Editing an account-less transaction: assigning an account, changing
amount/category/date/note — all normal. Switching between «Без счета» and a
real account is allowed in both directions (D4 covers the clearing
direction). Type remains immutable.

## Risks / Trade-offs

- *TS type widening ripples*: `CashflowTransaction.accountId` becomes
  `string | null`; every consumer that assumed a string must handle null.
  The compiler enumerates them; expected touches are display sites that
  already degrade gracefully (`v-if` guards, currency fallback).
- *Mobile pull of account-less rows*: today the shared normalizer would
  drop them (data loss on mobile). Widening the normalizer fixes mobile
  pull in the same change — the mirror persists the row and history/
  analytics include it; only the forms keep requiring an account.
- *REST/sync validation parity*: both validators must relax the same rule;
  the sync protocol tests pin the frozen per-item codes — INVALID_REFS for
  account-less cashflow disappears from both in lockstep, covered by new
  cases in both suites.

## Migration Plan

No data migration. Existing rows all have accounts; new rows may not. The
`account_contributions` view and all balance queries already handle NULL
account rows (they contribute nothing). Deploy is code-only; older clients
(should any exist outside this monorepo) that reject null accountId would
fail to render such rows — accepted, the clients ship together.

## Open Questions

None — all decisions were settled in the grilling session (2026-09-03):
true nullable model, permanent capability in web forms, web-only UI for
now, balances excluded, analytics included.
