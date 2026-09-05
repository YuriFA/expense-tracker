# Sync entity catalog

Repo-level source of truth for structural sync knowledge (ADR-0004).

- `manifest.json` is the hand-maintained declarative catalog - one entry per
  sync entity.
- `generate.mjs` derives runtime-specific artifacts for backend,
  `packages/local-data`, and app adapters.
- Generated files are committed. Regenerate with `pnpm sync-catalog:gen`.
- Check drift with `pnpm sync-catalog:gen-check`.

Rollout is complete: all six sync entities (`account`, `category`,
`debtor`, `debt_operation`, `planned_payment`, `transaction`) are
catalog-backed. There is no legacy handwritten structural path left; a new
sync entity must be added to the manifest (the type seams in
`sync-data.ts` / `restore.ts` fail to compile otherwise).

## Manifest reference

Per entity: `id` (canonical entity kind), backend metadata
(`goDomainConst`, `goInvalidDataMessage`), conflict-surface metadata
(`webConflictLabelKey`, `mobileConflictLabelRu`, `subjectFields`), and the
row / syncData / restore shapes.

- `row.table` + `row.rowType`: local persistence identity.
- `row.payloadFields`: fields of the stored domain payload (id is always
  included).
- `row.payloadVariants`: optional discriminator grouping for row -> payload
  (last variant is the else branch). When present, `payloadFields` holds
  only the base fields shared by every variant.
- `syncData.fields` / `restore.fields`: flat field lists.
  - `syncData.discriminator` + `syncData.variants` /
    `restore.variants`: type-discriminated entity (e.g. `transaction`);
    each variant carries its own full field list and the last variant is
    the else branch.
- Field kinds: `string` (`default` filled inline, or `nonEmpty`, or
  `nullable` - null is a valid preserved value), `optionalString` (absent
  when unset), `enum` (`values`), `int` (`min`, or `nonzero`), and
  `calendarDay` (`YYYY-MM-DD`).
- `syncData.guard`: raw boolean expression over the assembled `data`
  object, for checks that are not per-field.
- `row.extraPatchFields`: literal patches merged into row patches (e.g.
  `slug: null`).

The catalog owns structure only. Write rules (create/replace/delete
outcomes, reference checks, immutability) stay in the handwritten
adapters; the OpenAPI spec remains the wire-contract source of truth.
