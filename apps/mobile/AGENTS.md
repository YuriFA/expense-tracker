# Mobile (`apps/mobile/`) - agent memory

React Native + Expo. Currently a **fresh blank project** (blank-typescript
template: Expo SDK 57 / React Native 0.86 / React 19.2, TypeScript strict),
initialized clean. Workspace member `@expense-tracker/mobile`. The OpenAPI
contract and project-wide invariants live in the root `AGENTS.md`.

The intended mobile "twin" of web will share the domain model, design tokens,
and the `@expense-tracker/{api,money,i18n}` packages.

Architecture, persistence, navigation, and tooling are not yet established in
code. Re-establish and document them here as the app is built; until then this
file intentionally carries no stale implementation details.

Scripts (from `apps/mobile`): `bun run start` (`expo start`), `android`, `ios`,
`web`. Type-check: `bunx tsc --noEmit`.
