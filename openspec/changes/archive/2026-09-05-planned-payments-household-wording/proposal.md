# Planned Payments: household wording (spec-only)

## Why

The planned-payments spec predates household scoping (ADR-0002): its
ownership requirement and shape requirement still speak of plans, accounts,
and categories "owned by the same user" / "another user". The code and the
four sibling specs (accounts, categories, transactions, debts) have been
household-scoped since the household change; only this spec's wording
lagged behind. Finding B8 (rev.3 audit).

## What Changes

Documentation-only - no behavior, code, or contract change:

- The ownership requirement: plans belong to exactly one **household**;
  cross-household reads/updates/deletes behave as not-found; duplicate
  names are legal within a household. The "another user's plan is
  invisible" scenario becomes "another household's plan is invisible".
- The shape requirement: the account and category references are "of the
  same household" (was "owned by the same user"); the unknown-account
  scenario says "belongs to another household".

## Capabilities

### Modified Capabilities

- `planned-payments`: wording aligned with the enforced household scoping.
