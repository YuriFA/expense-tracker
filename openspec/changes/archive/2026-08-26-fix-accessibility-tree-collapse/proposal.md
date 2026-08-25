# Proposal: fix-accessibility-tree-collapse

## Why

After a successful create+sync cycle, presenting a picker sheet over a freshly
remounted form permanently collapses the app's accessibility exposure: the UI
keeps rendering, but XCUITest/VoiceOver see only native backdrop views until
the app restarts. The failure is deterministic (6/6 Maestro runs with the
picker cycle, 0/6 without), reproduces on both the plans form and the
new-transaction form, is a real VoiceOver defect — not a test-infra flake —
and blocks Maestro flow `17-plans-offline`, leaving `add-planned-payments`
at 34/35 tasks (task 8.3 full gates). Recorded in
`docs/technical-debt.md` ("Mobile") as needing its own investigation change.

## What Changes

- **Investigate to root cause**: minimal reproduction harness, white-box
  instrumentation of the sheet/modal/accessibility lifecycle, one-variable
  layer-isolation experiments, and upstream issue triage — establishing at
  which layer the collapse originates (application component, shared sheet
  wrapper, `@gorhom/bottom-sheet`, `react-native-screens`, React
  Native/Fabric, XCUITest bridge, or an interaction between several
  accessibility/modal containers).
- **Produce a technically concrete root-cause report** (trigger, minimal
  reproduction, observed vs expected native behavior, per-layer verdict,
  evidence, rejected hypotheses) before any fix lands.
- **Apply a minimal production-quality fix** at the established layer,
  followed by the full regression ladder (minimal repro → flow 17 → flow 16 →
  flows 09/15 → all flows 09–17 → full e2e suite ×3).
- Explicitly NOT: treating the problem by changing Maestro flows (retries,
  sleeps, coordinate taps, restarts) — flow 17 keeps testing the real user
  scenario.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mobile-forms`: the "Bottom Sheet forms separate container from form"
  requirement gains a scenario pinning that a sheet stack (form sheet + picker
  sheet) stays present in the accessibility tree after a create+sync cycle
  and a form remount, without an app restart.

## Impact

- **Code**: `apps/mobile` only. The fix layer is determined by the
  investigation (design D7 priority ladder: application architecture → shared
  `BottomSheet` abstraction → configuration → proven dependency upgrade →
  documented workaround). No `@gorhom/bottom-sheet` version is a presumed fix
  target until upstream triage (design D5) completes; upgrades are considered
  only for a proven upstream defect.
- **E2E**: `apps/mobile/.maestro/` — existing `_probe-*.yaml` files are
  immutable evidence; a new dedicated reproduction probe may be added as a
  separate file. Flow 17 itself is not modified.
- **Docs**: `docs/technical-debt.md` entry updated with the outcome.
- **Out of scope**: modifying `add-planned-payments` to route around the bug,
  changing the user scenario of flow 17, backend/web/packages, Maestro-only
  workarounds as the final fix, opportunistic refactors or upgrades beyond
  what the established root cause demonstrably requires (see design "Scope
  discipline").
