## Context

See `proposal.md` for motivation. Before this change, `apps/web` mixed a
shared `AmountField` with direct `NumberField`-based money inputs. The
`NumberField` path rendered a currency-formatted editable string inside the
input, which made refocus and repeated edits awkward because the caret landed
at the end of the formatted value and the currency symbol lived inside the
editable text.

The web app already keeps money as major-unit form state and converts to minor
units exactly once at the submit seam, so the new design only needs to change
input interaction and presentation. No backend, OpenAPI, or shared package
contract changes are required.

## Goals / Non-Goals

**Goals:**
- Provide one canonical money-input interaction contract across `apps/web`.
- Optimize for fast replacement and editing of amounts in the highest-traffic
  user flows.
- Keep currency obvious during editing without putting the symbol in the
  editable text.
- Preserve direct signed editing where the existing product contract requires
  it, especially adjustment edits.
- Add test coverage and a guardrail so web money input does not drift back to
  multiple implementations.

**Non-Goals:**
- Changing money storage, conversion, or API contracts.
- Adding currency selection to forms that do not already choose currency.
- Reworking non-money inputs or changing the mobile app's money-entry UX.
- Introducing shorthand amount syntax such as `1k` or more than two fraction
  digits.

## Decisions

### 1. Replace `NumberField`-based money editing with one domain-specific `AmountField`

The canonical web money input is a plain text input with `inputmode="decimal"`
and domain-specific parse/format behavior.

Why:
- The product requirement is not generic number editing. It is a specific
  money-entry contract with raw draft on focus and pretty money on blur.
- A text input gives direct control over draft state, caret handling, tolerant
  paste, signed-vs-positive modes, and locale-aware formatting.
- It keeps the implementation local to `apps/web` and avoids changing shared
  packages with DOM-specific behavior.

Alternatives considered:
- Keep `NumberField` and patch around its focus/caret behavior. Rejected
  because the formatted editable value is the source of the UX problem.
- Add `Maskito`. Rejected as the production path because the chosen UX keeps
  the currency cue outside the editable text, so the library's postfix/caret
  machinery would not remove enough custom state logic to justify a new
  dependency.

### 2. Focused state uses a raw numeric draft; blurred state uses formatted money

While focused, the field renders only the numeric draft. While blurred, it
renders locale-aware money formatting for the same numeric value.

Why:
- Users can replace or adjust the amount without first fighting grouping,
  padding, or the currency symbol.
- The blurred state still matches the rest of the product's money display.

Alternatives considered:
- Keep formatted money visible during editing. Rejected because it preserves
  the caret friction that triggered the change.
- Show the same `number + suffix` layout in both states. Rejected because the
  existing product already uses canonical blurred money formatting elsewhere.

### 3. Currency stays visible as a non-editable suffix cue

The field keeps the currency visible during editing as a non-editable visual
cue rendered separately from the editable text.

Why:
- It preserves currency clarity without making the symbol part of the draft.
- It supports both fixed-currency and account-driven forms with the same UI
  contract.

Alternatives considered:
- Hide currency while focused. Rejected because users still need to confirm
  which currency they are editing.
- Keep a literal postfix inside `input.value`. Rejected because it weakens the
  clean raw-draft model and brings back caret-boundary concerns.

### 4. Parsing is tolerant, but precision stays strict

The field accepts common human-entered and pasted representations, including
`.` and `,` decimals, grouping spaces, and pasted currency symbols, but keeps
at most two fractional digits.

Why:
- This removes friction from real-world paste and typing habits.
- The money model is still two-decimal everywhere, so the input contract
  should reject or trim precision beyond that boundary rather than silently
  broadening it.

### 5. One shared component supports both positive and signed modes

The default mode is positive-only. A signed mode is used only where the
product already requires direct signed editing, notably adjustment edits.

Why:
- One component keeps the UX consistent while still respecting the existing
  product contract for adjustments.
- Separate components would create another divergence surface for behavior and
  tests.

### 6. Add label-based selectors and a regression guardrail

Amount fields receive stable ids or accessible labels so tests can target them
by user-facing semantics rather than widget roles, and the web test suite adds
an explicit guard against reintroducing `NumberField`-based money editing.

Why:
- The widget is no longer a spinbutton, so role-based selectors would encode
  the old implementation rather than the new user contract.
- A guard test protects the agreed standard from future drift.

## Risks / Trade-offs

- [Caret behavior differs between keyboard focus and pointer focus] → Keep the
  split intentional: keyboard focus selects for quick replacement, pointer
  focus respects local editing.
- [Tolerant parsing can hide ambiguous human formats] → Accept only the common,
  equivalent representations already agreed for the product and cap precision
  at two fractional digits.
- [Moving from `spinbutton` to text input breaks existing tests] → Migrate e2e
  tests to label-based selectors and add dedicated amount-input regression
  coverage.
- [A web-only custom component could drift from future consumers] → Centralize
  the contract in `shared/ui/amount-field`, document it in OpenSpec, and add a
  guard test that blocks direct legacy money-input patterns.

## Migration Plan

1. Replace the internal implementation of `shared/ui/amount-field` with the
   new raw-draft/pretty-blur contract.
2. Migrate remaining direct `NumberField` money inputs to `AmountField`,
   including the inline account-creation and adjustment-edit flows.
3. Update existing e2e selectors from the legacy spinbutton role to stable
   labels and add dedicated regression coverage for paste, replacement, signed
   editing, and mobile-width behavior.
4. Remove the now-unused `shared/ui/number-field` wrappers and keep a guard
   test that prevents their return for money editing.

## Open Questions

None.
