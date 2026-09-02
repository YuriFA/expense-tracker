## 1. Shared amount-field contract

- [x] 1.1 Replace the web `AmountField` internals with a text-input-based raw-draft editor that formats as money on blur.
- [x] 1.2 Implement shared parsing and formatting helpers for positive and signed amount-entry modes, including tolerant paste handling and two-decimal precision.

## 2. Screen migration

- [x] 2.1 Migrate the remaining account-creation and adjustment-edit money inputs to the shared `AmountField` contract.
- [x] 2.2 Ensure every web money-input surface exposes stable ids or accessible labels that match the new shared control.

## 3. Cleanup and guardrails

- [x] 3.1 Remove the legacy `NumberField`-based money-editing wrappers from `apps/web`.
- [x] 3.2 Add a regression guard that fails if web money editing drifts back to direct `NumberField` usage.

## 4. Validation

- [x] 4.1 Update affected component and e2e tests from legacy spinbutton assumptions to the new amount-entry semantics.
- [x] 4.2 Add focused regression coverage for formatted paste, quick replacement, signed adjustment editing, and mobile-width amount entry.
