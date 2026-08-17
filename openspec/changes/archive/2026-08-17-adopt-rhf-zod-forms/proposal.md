# Proposal: adopt-rhf-zod-forms

## Why

Every form in `apps/mobile` (login, register, new-account, new-category,
new-transaction) is hand-rolled today: one `useState` per field, a single
aggregate error string, ad-hoc `canSubmit` derivations, manual reset functions.
This duplicates form-state machinery per form, has no touched/dirty tracking,
and leaves the two auth screens with zero tests. `apps/mobile/AGENTS.md`
already prescribes React Hook Form + Zod, but the library decision was never
formally adopted: the dependencies are not installed and no runnable reference
exists, so each new form re-invents state management against the documented
convention.

## What Changes

- **Adopt `react-hook-form@^7` + `zod@^4` + `@hookform/resolvers@^5`** as the
  form stack in `apps/mobile` (zod major aligned with `apps/web`'s `^4.4.2`).
- **RHF + Zod becomes the standard for non-trivial forms** in `apps/mobile`:
  field values, client validation, touched/dirty state, submit state, and
  field/form-level errors come from `useForm({ resolver: zodResolver(schema) })`.
- **Hand-rolled form state is disallowed** for non-trivial forms: independent
  `useState` per field/error/touched flag must not be used. Plain `useState`
  remains correct for non-form UI state (open/closed, view mode, animation)
  and for simple ephemeral controls or isolated inputs that are not
  meaningfully a form.
- **Canonical reference examples** live in
  `apps/mobile/docs/conventions/forms.md` (simple page form, FormProvider-based
  composite form, Bottom Sheet container/form split, form-values-vs-payload
  mapping, `handle*`/`on*` naming). The change endorses this document and
  reconciles its snippets with repo invariants (notably money parsing).
- **Conventions recorded project-wide**: `Controller`/`useController` for RN
  inputs and custom fields, `FormProvider`/`useFormContext` thresholds, Zod
  schema placement in the FSD slice (`model/schema.ts`), deliberate form
  reset/lifecycle, Bottom Sheet as presentation container with the form as an
  independent component.
- **No mass migration**: existing forms keep working and are migrated
  opportunistically when next touched. No existing form is rewritten solely
  for the sake of migration in this change.

## Capabilities

### New Capabilities

- `mobile-forms`: how forms in `apps/mobile` behave and are structured —
  declarative form state, client validation gating, per-field error
  visibility, server-error surfacing by repository error code, duplicate-
  submission prevention, money field parsing to int64 minor units, Bottom
  Sheet container/form separation, deliberate reset/lifecycle, and form
  testing expectations.

### Modified Capabilities

(none — no existing spec's requirements change; existing screens keep their
current externally observable behavior until each is migrated in a later
change.)

## Impact

- **apps/mobile**: add `react-hook-form`, `zod`, `@hookform/resolvers` to
  `package.json` (first real usage will come from future forms; knip needs a
  temporary `ignoreDependencies` entry for the three packages until then).
- **apps/mobile/docs/conventions/forms.md**: endorsed as canonical; snippets
  reconciled with the money invariant (`parseMajorUnitsToMinor`, never
  `Number()` float parsing).
- **apps/mobile/AGENTS.md**: Forms section links the conventions document and
  records the adoption decision.
- **Root `knip.json`**: temporary `ignoreDependencies` for the three packages
  (removed when the first form migrates).
- **Not affected**: `packages/*` (RHF/zod stay app-local — shared packages
  remain platform-agnostic with no new dependencies), `apps/web` (keeps
  vee-validate + zod), backend, OpenAPI contract.
