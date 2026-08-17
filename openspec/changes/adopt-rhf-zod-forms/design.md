# Design: adopt-rhf-zod-forms

## Context

See `proposal.md` for motivation. Facts that shape the design:

- Five hand-rolled forms exist in `apps/mobile` (`login-screen`,
  `register-screen`, `new-account-sheet`, `new-category-sheet`,
  `new-transaction-sheet`), all using per-field `useState` + one aggregate
  error string; none use RHF or Zod (zero occurrences in `apps/mobile` and in
  the lockfile outside `apps/web`).
- `apps/mobile/AGENTS.md` already documents the target conventions (Forms
  section) and explicitly requires a library adoption like this to go through
  OpenSpec — this change is that decision.
- `apps/mobile/docs/conventions/forms.md` already contains canonical worked
  examples (page form, FormProvider composite, Bottom Sheet split,
  values-vs-payload mapping, naming). It predates the dependency decision.
- `apps/web` already uses `zod ^4.4.2` (with vee-validate — Vue-idiomatic).
  Shared `packages/*` have no validation dependency and must stay
  platform-agnostic.
- Root `knip.json` gates unused dependencies; deps installed without a
  consumer would fail `pnpm knip` until the first form migrates.

## Goals / Non-Goals

**Goals:**

- Make React Hook Form + Zod the formally adopted, installable form standard
  for `apps/mobile`, with conventions recorded where agents look for them
  (`AGENTS.md`, `docs/conventions/forms.md`).
- Keep the conventions document consistent with repo invariants (money as
  int64 minor units, error mapping by machine `code`).
- Land with zero change to existing app runtime behavior — dependencies and
  documentation only.

**Non-Goals:**

- Migrating any existing form (login/register/sheets migrate opportunistically
  in the changes that next touch them).
- Touching `apps/web` (vee-validate + zod stays) or shared `packages/*`
  (no new dependencies there).
- Building new shared form UI primitives — existing `Input`, `BottomSheetInput`,
  `Button` already fit RHF's `Controller` binding (value/onChange/error props).
- Centralizing schemas across apps — each app keeps its own Zod schemas local
  to its FSD slices.

## Decisions

### D1. Form state library: React Hook Form

Chosen for: uncontrolled-first model that fits React Native (no DOM `register`
ref semantics required when using `Controller`), small runtime, first-class
touched/dirty/submit-state/field-error semantics, `FormProvider` context for
composite forms, and the largest RN ecosystem alignment. The version range is
an install-time choice (task 1.1 pins the current stable major, `^7`); only
the Zod alignment in D2 is a repo-verifiable constraint.

Alternatives rejected: **keep hand-rolled `useState`** — already duplicating
field/error/submit machinery across five forms with no touched tracking;
**Formik** — effectively unmaintained, rerender-heavy; **vee-validate** —
Vue-first, wrong fit for React Native even though web uses it.

### D2. Validation library: Zod, major version aligned with web

`zod@^4` in `apps/mobile` matching `apps/web`'s `^4.4.2`: one mental model and
one major version across the monorepo, and Zod 4 implements Standard Schema so
resolver integration is stable. Schemas live app-local in the FSD slice
(`model/schema.ts` for reusable feature-level schemas; co-located with a
page-local form when there is no reuse), mirroring web's `model/*-schema.ts`
placement. Form value types are inferred from the schema (`z.infer`), not
duplicated.

Alternatives rejected: **yup / valibot** — would fork validation idioms
between apps for no benefit; **Zod in `packages/*`** — no package needs
validation today, and shared packages stay dependency-light and
platform-agnostic.

### D3. Resolver: `@hookform/resolvers` with `zodResolver`

The maintained official resolver package, installed at the current stable
major (`^5` per task 1.1). Its `zodResolver` is expected to work with Zod 4;
that compatibility is confirmed by the task 1.2 smoke check rather than
asserted here. `useForm<FormValues>({ resolver: zodResolver(schema),
defaultValues })` is the single wiring pattern documented in `forms.md`.

### D4. "Non-trivial form" is semantic, not a field count

Non-trivial user-input forms — those with validation, submission, multiple
coordinated fields, or a meaningful form lifecycle — use React Hook Form +
Zod. Simple ephemeral controls or isolated inputs that are not meaningfully a
form (a search filter, a single toggle) may use local React state. The test is
whether the UI is genuinely a form, not how many fields it has.

### D5. Field binding: `Controller`/`useController`; `FormProvider` by composition need

React Native inputs and custom fields integrate with RHF through `Controller`
or `useController` — value/onChange/onBlur binding, not DOM `register` refs.
Prefer `useController` inside reusable field components; use `Controller` at
the form composition level when appropriate. Do not add custom field
abstractions or extra wrapping for simple forms — a couple of direct
`Controller` props is fine.

`FormProvider` + `useFormContext<FormValues>()` is for forms with meaningful
composition depth, deeply nested custom fields, or reusable field groups. Do
not introduce `FormProvider` merely to avoid passing one or two props; simple
forms use direct props — the thresholds already written in `AGENTS.md` stand.
The existing `Input` needs no changes: it is controlled
(`value`/`onChangeText`) and takes `error` + `errorTestId`, matching the
field/fieldState shape that both `Controller` and `useController` expose.

Submit boundary: `onPress={form.handleSubmit(handleSubmit)}` is idiomatic and
allowed; extracting `const handleFormSubmit = form.handleSubmit(handleSubmit)`
is optional (when the wrapped handler is reused or JSX gets noisy). Do not add
another `handlePress` wrapper around `form.handleSubmit(...)` without
additional behavior, and keep `on*` for callback props / `handle*` for
implementation-side handlers as in `AGENTS.md`.

### D6. Bottom Sheet forms: container owns presentation, form owns state

Endorses `docs/conventions/forms.md` §3 as normative: the sheet component owns
ref/snap points/dismissal/header; the form is a separate component with its
own `useForm`, unaware it is in a sheet. Text inputs inside sheets use
`BottomSheetInput` (keyboard registration + accessibility exposure — Maestro
depends on it). Reset is explicit and tied to flow lifecycle
(`form.reset(defaultValues)` on success/mode change, or a remount/key strategy
when clearer) — never assumed from incidental unmounts.

### D7. Zod validates form values; a named mapper builds the payload

Zod validates and parses user-facing form values (an amount stays a string in
major units). Form values are not automatically the API/domain payload:
submission goes through a named mapper such as
`toTransactionPayload(values)` that produces the repository/domain payload.
Money conversion to int64 minor units happens at that mapping/domain boundary
through the shared `parseMajorUnitsToMinor` — never `Number()` float math.
A Zod schema must not construct the API/domain payload or perform the money
conversion itself: it may check that an amount string is parseable (via the
shared parser); the conversion belongs to the mapper. `forms.md` §4 already
shows the mapper; §2's validation snippet currently parses with
`Number(value.replace(',', '.'))` and must be reconciled to a parseability
check with the shared parser, leaving conversion to the mapper.

### D8. Server errors surface at form level, keyed by machine `code`

On repository/mutation failure the form calls `setError('root', …)` (RHF's
form-level error slot) with the message from the existing shared mapping
(`getRepositoryErrorText`, keyed by `RepositoryError.code`) — consistent with
the cross-cutting rule that clients map errors by code, not HTTP status.
Entered values are preserved for retry. Duplicate-submission blocking derives
from the pending state of the submission operation — RHF
`formState.isSubmitting`, the mutation's `isPending`, or a combination; which
one a form uses is an implementation detail the spec does not dictate.

### D9. Reference examples are the docs snippets; no synthetic files, no migration

Runnable-looking example components outside real screens would be flagged by
knip as unused files, and migrating real forms was ruled out of scope. The
canonical references are therefore the worked examples in
`docs/conventions/forms.md` (reconciled per D7), pointed to from `AGENTS.md`.
The first real consumer of the stack will be whichever form migrates first in
a later change.

### D10. Knip tolerates the adoption window

Until the first form migrates, `react-hook-form`, `zod`, and
`@hookform/resolvers` have no imports in `apps/mobile` and would fail
`pnpm knip`. They are added to root `knip.json` → `apps/mobile` →
`ignoreDependencies` with a comment referencing this change; the entry is
removed by the change that first imports them.

## Risks / Trade-offs

- [Three unused dependencies until the first migration] → Temporary knip
  `ignoreDependencies` (D10) with an explicit removal note; the window is
  documentation-only, no runtime risk.
- [Two form stacks in the monorepo (web vee-validate, mobile RHF)] → Accepted:
  each app uses its platform-idiomatic stack; both standardize on Zod for
  validation, which is where schema logic lives.
- [Bundle size grows (both libraries ship with the app; combined on the order
  of tens of KB min+gzip)] → Acceptable for a
  feature-rich app; RHF is uncontrolled-first so it can reduce rerenders
  versus per-field `useState` forms.
- [Docs snippets can drift from real usage since no in-repo consumer exists
  yet] → First migrating change must reconcile `forms.md` against real code;
  `AGENTS.md` keeps pointing at the doc as canonical.
- [zod v3 exists transitively in the lockfile (web's `zod-validation-error`)]
  → Harmless: pnpm isolates versions; mobile pins `^4` explicitly.

## Migration Plan

1. Add dependencies to `apps/mobile` + knip tolerance (D10); smoke-check that
   `zodResolver` + Zod 4 type-check in a scratch compile (no committed usage).
2. Reconcile `docs/conventions/forms.md` with invariants (D7 money snippet,
   D8 server-error pattern, reset/lifecycle wording).
3. Update `apps/mobile/AGENTS.md` Forms section to record the adoption and
   link the conventions doc as canonical.
4. Verify: `pnpm type-check`, `lint`, `format`, `test`, `pnpm knip`,
   `pnpm test:e2e`, `expo export` — all green with no app-source changes.

Rollback is trivial (no runtime change): remove the three deps, revert the
knip entry, revert docs edits.

## Open Questions

- Which existing form migrates first (login screen is the natural smallest
  candidate)? Deferrable — answered by the first feature change that touches
  a form; it removes the knip tolerance entry (D10).
