## Why

Web money inputs had diverged across screens and some of them used a currency-formatted editable string that pushed the caret to the end on refocus. That made repeated amount entry slower and more error-prone in the core flows where users create accounts, transactions, debts, plans, and reconciliations.

## What Changes

- Standardize every web money input on one shared amount-entry interaction contract.
- Define focused-state behavior as a raw numeric draft with a visible, non-editable currency cue instead of an editable currency-formatted string.
- Define blurred-state behavior as locale-aware pretty money formatting.
- Require tolerant paste and parsing for common human-entered formats while keeping money precision limited to two fractional digits.
- Preserve direct signed editing for adjustment transaction edits while keeping other amount-entry flows non-negative.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-screens`: add a canonical web amount-entry requirement covering shared money-input behavior across account, transaction, debt, plan, and reconcile forms.

## Impact

- Affected code is confined to `apps/web`, especially `shared/ui/amount-field` and the form screens that collect monetary values.
- No backend, OpenAPI, persistence, or shared package contract changes.
- Removes the web-specific dependency on `NumberField`-based money editing in favor of one shared amount-field contract.
